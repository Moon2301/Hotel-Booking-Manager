import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  DataSource,
  EntityManager,
  LessThan,
  IsNull,
  In,
  Not,
} from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as QRCode from 'qrcode';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  Booking,
  BookingStatus,
  PaymentStatus,
} from './entities/booking.entity';
import { BookingHold } from './entities/booking-hold.entity';
import { BookingLineItem } from './entities/booking-line-item.entity';
import { IdempotencyKey } from './entities/idempotency-key.entity';
import { CancellationPolicy } from './entities/cancellation-policy.entity';
import {
  CreateHoldDto,
  ConfirmBookingDto,
  AvailabilityQueryDto,
  ListBookingsQueryDto,
  CancelBookingDto,
  CheckInDto,
  CheckInOccupantDto,
  CreateCancellationPolicyDto,
  UpdateCancellationPolicyDto,
} from './dto/booking.dto';
import { AuditLog } from '../auth/entities/audit-log.entity';
import { Property } from '../property/entities/property.entity';
import { Room, RoomStatus } from '../property/entities/room.entity';
import { RoomType } from '../property/entities/room-type.entity';
import { DailyRate } from '../pricing/entities/daily-rate.entity';
import { NotificationService } from '../notification/notification.service';
import { MailService } from './mail.service';
import { GuestService } from '../guest/guest.service';
import { BookingOccupant } from './entities/booking-occupant.entity';
import { BookingCharge, BookingChargeStatus } from './entities/booking-charge.entity';
import { Invoice, InvoiceType, PaymentStatus as InvoicePaymentStatus } from './entities/invoice.entity';

export interface AvailabilityResult {
  roomTypeId: string;
  roomTypeName: string;
  available: number;
}

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    @InjectRepository(Booking) private bookingRepo: Repository<Booking>,
    @InjectRepository(BookingHold) private holdRepo: Repository<BookingHold>,
    @InjectRepository(BookingLineItem)
    private lineItemRepo: Repository<BookingLineItem>,
    @InjectRepository(IdempotencyKey)
    private idempotencyRepo: Repository<IdempotencyKey>,
    @InjectRepository(CancellationPolicy)
    private policyRepo: Repository<CancellationPolicy>,
    @InjectRepository(Property) private propertyRepo: Repository<Property>,
    @InjectRepository(Room) private roomRepo: Repository<Room>,
    @InjectRepository(RoomType) private roomTypeRepo: Repository<RoomType>,
    @InjectRepository(DailyRate) private dailyRateRepo: Repository<DailyRate>,
    @InjectRepository(AuditLog) private auditRepo: Repository<AuditLog>,
    @InjectRepository(BookingOccupant)
    private occupantRepo: Repository<BookingOccupant>,
    @InjectRepository(BookingCharge)
    private chargeRepo: Repository<BookingCharge>,
    @InjectRepository(Invoice)
    private invoiceRepo: Repository<Invoice>,
    private dataSource: DataSource,
    private notificationService: NotificationService,
    private jwtService: JwtService,
    private config: ConfigService,
    private mailService: MailService,
    private guestService: GuestService,
  ) {}

  /**
   * After payment: assign a physical room and mark RESERVED (chờ check-in tại quầy).
   */
  async assignRoomOnPayment(bookingId: string, actorId: string): Promise<Booking> {
    const booking = await this.bookingRepo.findOne({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');

    if (booking.paymentStatus !== PaymentStatus.PAID) {
      throw new BadRequestException('Booking must be paid before room assignment');
    }

    if (booking.status !== BookingStatus.CONFIRMED) {
      return booking;
    }

    let room: Room | null = null;
    if (booking.roomId) {
      room = await this.roomRepo.findOne({ where: { id: booking.roomId } });
      if (room && room.status === RoomStatus.AVAILABLE) {
        room.status = RoomStatus.RESERVED;
        await this.roomRepo.save(room);
      }
      return booking;
    }

    room = await this.roomRepo.findOne({
      where: {
        propertyId: booking.propertyId,
        roomTypeId: booking.roomTypeId,
        status: RoomStatus.AVAILABLE,
      },
      order: { roomNumber: 'ASC' },
    });

    if (!room) {
      this.logger.warn(
        `No AVAILABLE room to reserve for booking ${bookingId} (type ${booking.roomTypeId})`,
      );
      return booking;
    }

    room.status = RoomStatus.RESERVED;
    await this.roomRepo.save(room);

    booking.roomId = room.id;
    await this.bookingRepo.save(booking);

    await this.auditRepo.save(
      this.auditRepo.create({
        actorId,
        action: 'booking.room_reserved',
        entityType: 'bookings',
        entityId: bookingId,
        after: { roomId: room.id, roomStatus: RoomStatus.RESERVED },
      }),
    );

    return booking;
  }

  private async releaseReservedRoom(roomId: string): Promise<void> {
    const room = await this.roomRepo.findOne({ where: { id: roomId } });
    if (!room) return;
    if (room.status === RoomStatus.RESERVED) {
      room.status = RoomStatus.AVAILABLE;
      await this.roomRepo.save(room);
    }
  }

  // ─── Availability ─────────────────────────────────────────────────────────

  async checkAvailability(query: AvailabilityQueryDto): Promise<AvailabilityResult[]> {
    const { propertyId, from, to } = query;
    return this.computeAvailability(propertyId, from, to, this.dataSource.manager);
  }

  /**
   * Core availability calculation — can run inside an existing EntityManager
   * (transaction) or against the default manager.
   */
  private async computeAvailability(
    propertyId: string,
    from: string,
    to: string,
    em: EntityManager,
  ): Promise<AvailabilityResult[]> {
    const nights = this.generateNightDates(from, to);
    const roomTypes = await em.find(RoomType, { where: { propertyId } });
    const results: AvailabilityResult[] = [];
    const now = new Date();

    for (const rt of roomTypes) {
      const totalRooms = await em.count(Room, {
        where: { propertyId, roomTypeId: rt.id },
      });

      let minAvailable = totalRooms;
      for (const night of nights) {
        const activeBookings = await em.count(Booking, {
          where: {
            propertyId,
            roomTypeId: rt.id,
            status: In([BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN]),
            checkIn: LessThan(this.addDays(night, 1)),
            checkOut: Not(LessThan(this.addDays(night, 1))),
          } as any,
        });

        // Only holds overlapping this night (not all active holds for the type)
        const activeHolds = await em
          .createQueryBuilder(BookingHold, 'h')
          .where('h.property_id = :propertyId', { propertyId })
          .andWhere('h.room_type_id = :roomTypeId', { roomTypeId: rt.id })
          .andWhere('h.released_at IS NULL')
          .andWhere('h.expires_at > :now', { now })
          .andWhere(':night = ANY(h.nights)', { night })
          .getCount();

        const available = totalRooms - activeBookings - activeHolds;
        if (available < minAvailable) minAvailable = available;
      }

      results.push({
        roomTypeId: rt.id,
        roomTypeName: rt.name,
        available: Math.max(0, minAvailable),
      });
    }

    return results;
  }

  // ─── Hold ─────────────────────────────────────────────────────────────────

  async createHold(dto: CreateHoldDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 🔒 Pessimistic lock on property row — serializes concurrent hold requests
      // for the same property so only one can check-count-insert at a time.
      const property = await queryRunner.manager.findOne(Property, {
        where: { id: dto.propertyId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!property) throw new NotFoundException('Property not found');

      if (!dto.nights?.length) {
        throw new BadRequestException('At least one night is required');
      }

      // Must match checkAvailability: `to` is checkout date (day after last night),
      // not the last night itself — otherwise we under-count nights vs step 2 UI.
      const stayFrom = this.toDateString(dto.nights[0]);
      const stayTo = this.addDays(dto.nights[dto.nights.length - 1], 1);

      const avail = await this.computeAvailability(
        dto.propertyId,
        stayFrom,
        stayTo,
        queryRunner.manager,
      );
      const rtAvail = avail.find((a) => a.roomTypeId === dto.roomTypeId);
      if (!rtAvail || rtAvail.available <= 0) {
        throw new ConflictException({
          code: 'ROOM_UNAVAILABLE',
          message: 'No rooms available for the selected dates',
        });
      }

      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + property.holdTtlSeconds);

      const hold = queryRunner.manager.create(BookingHold, {
        propertyId: dto.propertyId,
        roomTypeId: dto.roomTypeId,
        nights: dto.nights,
        expiresAt,
      });

      const saved = await queryRunner.manager.save(hold);
      await queryRunner.commitTransaction();
      return saved;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async cleanupExpiredHolds() {
    this.logger.log('Running cleanup job for expired holds...');
    const result = await this.holdRepo
      .createQueryBuilder()
      .update()
      .set({ releasedAt: new Date() })
      .where(
        'expires_at < :now AND released_at IS NULL AND booking_id IS NULL',
        { now: new Date() },
      )
      .execute();

    if (result.affected && result.affected > 0) {
      this.logger.log(`Released ${result.affected} expired holds`);
    }
  }

  async releaseHold(id: string) {
    const hold = await this.holdRepo.findOne({
      where: { id, releasedAt: IsNull() },
    });
    if (!hold) return { success: true, message: 'Hold already released or not found' };

    hold.releasedAt = new Date();
    await this.holdRepo.save(hold);
    return { success: true };
  }

  // ─── Booking ──────────────────────────────────────────────────────────────

  async createBooking(
    idempotencyKey: string,
    dto: ConfirmBookingDto,
    requestHash: string,
    actorId: string,
  ) {
    const cachedResponse = await this.checkIdempotency(
      idempotencyKey,
      actorId,
      requestHash,
    );
    if (cachedResponse) return cachedResponse;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const hold = await queryRunner.manager.findOne(BookingHold, {
        where: { id: dto.holdId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!hold) throw new NotFoundException('Hold not found');
      if (hold.releasedAt) throw new BadRequestException('Hold already released');
      if (hold.expiresAt < new Date()) throw new BadRequestException('Hold expired');
      if (hold.bookingId) throw new BadRequestException('Hold already converted to booking');

      const rt = await queryRunner.manager.findOne(RoomType, {
        where: { id: hold.roomTypeId },
      });
      const policy = await queryRunner.manager.findOne(CancellationPolicy, {
        where: { propertyId: hold.propertyId, isActive: true },
        order: { createdAt: 'DESC' },
      });

      const checkInDate = this.toDateString(hold.nights[0]);
      const checkOutDate = this.addDays(
        hold.nights[hold.nights.length - 1],
        1,
      );

      const booking = queryRunner.manager.create(Booking, {
        propertyId: hold.propertyId,
        roomTypeId: hold.roomTypeId,
        guestId: dto.guestId,
        status: BookingStatus.CONFIRMED,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        paymentStatus: PaymentStatus.PENDING,
        policySnapshot: policy
          ? {
              free_cancel_until_hours_before_checkin:
                policy.freeCancelUntilHoursBeforeCheckin,
              fee_rule: policy.feeRuleRef,
              no_show_rule: policy.noShowRule,
              policy_version: policy.policyVersion,
              snapshotted_at: new Date().toISOString(),
            }
          : undefined,
      });

      const savedBooking = await queryRunner.manager.save(booking);

      hold.bookingId = savedBooking.id;
      hold.releasedAt = new Date();
      await queryRunner.manager.save(hold);

      let totalAmount = 0;
      for (const nightRaw of hold.nights) {
        const night = this.toDateString(nightRaw);
        const rate = await queryRunner.manager.findOne(DailyRate, {
          where: {
            propertyId: hold.propertyId,
            roomTypeId: hold.roomTypeId,
            night,
          },
        });

        const unitPrice = rate
          ? Number(rate.amount)
          : Number(rt?.basePrice || 0);
        const lineItem = queryRunner.manager.create(BookingLineItem, {
          bookingId: savedBooking.id,
          night,
          unitPrice,
          currency: rate?.currency || 'VND',
        });
        await queryRunner.manager.save(lineItem);
        totalAmount += unitPrice;
      }

      savedBooking.totalAmount = totalAmount;
      await queryRunner.manager.save(savedBooking);

      await queryRunner.manager.save(
        AuditLog,
        queryRunner.manager.create(AuditLog, {
          actorId,
          action: 'booking.create',
          entityType: 'bookings',
          entityId: savedBooking.id,
          after: savedBooking as any,
        }),
      );

      await queryRunner.commitTransaction();

      // Trigger push notification to guest
      try {
        await this.notificationService.sendPushNotification(
          savedBooking.guestId,
          'booking.confirmed',
          savedBooking.id,
        );
      } catch (notifErr) {
        this.logger.error(`Failed to send booking confirmed notification: ${notifErr.message}`);
      }

      await this.saveIdempotency(
        idempotencyKey,
        actorId,
        requestHash,
        savedBooking,
      );
      return savedBooking;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Gán phòng RESERVED cho booking PAID chưa có phòng; cron xử lý PAID > 30 phút.
   */
  async syncPaidBookings(propertyId: string | undefined, actorId: string) {
    const qb = this.bookingRepo
      .createQueryBuilder('booking')
      .where('booking.paymentStatus = :paid', { paid: PaymentStatus.PAID })
      .andWhere('booking.status = :confirmed', {
        confirmed: BookingStatus.CONFIRMED,
      });

    if (propertyId) {
      qb.andWhere('booking.propertyId = :propertyId', { propertyId });
    }

    const bookings = await qb.getMany();
    const staleCutoff = new Date(Date.now() - 30 * 60 * 1000);

    let assigned = 0;
    let autoStale = 0;

    for (const booking of bookings) {
      const isStale = booking.updatedAt <= staleCutoff;
      if (!booking.roomId) {
        await this.assignRoomOnPayment(booking.id, actorId);
        assigned++;
        if (isStale) autoStale++;
      } else if (isStale) {
        await this.assignRoomOnPayment(booking.id, actorId);
        autoStale++;
      }
    }

    return {
      total: bookings.length,
      assigned,
      autoStaleProcessed: autoStale,
    };
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async cronSyncStalePaidBookings() {
    const staleCutoff = new Date(Date.now() - 30 * 60 * 1000);
    const stale = await this.bookingRepo.find({
      where: {
        paymentStatus: PaymentStatus.PAID,
        status: BookingStatus.CONFIRMED,
      },
    });

    for (const booking of stale) {
      if (booking.updatedAt > staleCutoff) continue;
      if (!booking.roomId) {
        try {
          await this.assignRoomOnPayment(booking.id, 'cron:auto-paid-30m');
          this.logger.log(
            `Auto-assigned room for stale PAID booking ${booking.id}`,
          );
        } catch (err) {
          this.logger.warn(
            `Failed auto-assign for booking ${booking.id}: ${err.message}`,
          );
        }
      }
    }
  }

  async reassignBookingRoom(
    bookingId: string,
    roomId: string,
    actorId: string,
  ) {
    const booking = await this.bookingRepo.findOne({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');

    if (booking.paymentStatus !== PaymentStatus.PAID) {
      throw new BadRequestException('Only PAID bookings can be reassigned');
    }

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException(
        'Room reassignment only allowed before check-in',
      );
    }

    const room = await this.roomRepo.findOne({
      where: {
        id: roomId,
        propertyId: booking.propertyId,
        roomTypeId: booking.roomTypeId,
      },
    });
    if (!room) throw new NotFoundException('Room not found or incompatible');

    const previousRoomId = booking.roomId;
    if (previousRoomId && previousRoomId !== roomId) {
      await this.releaseReservedRoom(previousRoomId);
    }

    booking.roomId = room.id;
    await this.bookingRepo.save(booking);

    if (room.status === RoomStatus.AVAILABLE) {
      room.status = RoomStatus.RESERVED;
      await this.roomRepo.save(room);
    }

    await this.auditRepo.save(
      this.auditRepo.create({
        actorId,
        action: 'booking.reassign_room',
        entityType: 'bookings',
        entityId: bookingId,
        after: { roomId: room.id, roomNumber: room.roomNumber },
      }),
    );

    return this.getBooking(bookingId);
  }

  async listBookings(query: ListBookingsQueryDto) {
    const {
      propertyId,
      status,
      paymentStatus,
      guestId,
      checkInFrom,
      checkInTo,
      page = 1,
      limit = 20,
    } = query;

    const qb = this.bookingRepo
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.guest', 'guest')
      .leftJoinAndSelect('booking.roomType', 'roomType')
      .leftJoinAndSelect('booking.property', 'property')
      .leftJoinAndSelect('booking.room', 'room')
      .select([
        'booking',
        'guest.id',
        'guest.email',
        'guest.fullName',
        'guest.phone',
        'roomType.id',
        'roomType.name',
        'property.id',
        'property.name',
        'room.id',
        'room.roomNumber',
        'room.status',
        'room.roomTypeId',
      ]);

    if (propertyId) qb.andWhere('booking.propertyId = :propertyId', { propertyId });
    if (status) qb.andWhere('booking.status = :status', { status });
    if (query.paymentStatus) {
      qb.andWhere('booking.paymentStatus = :paymentStatus', {
        paymentStatus: query.paymentStatus,
      });
    }
    if (guestId) qb.andWhere('booking.guestId = :guestId', { guestId });
    if (checkInFrom) qb.andWhere('booking.checkIn >= :checkInFrom', { checkInFrom });
    if (checkInTo) qb.andWhere('booking.checkIn <= :checkInTo', { checkInTo });

    qb.orderBy('booking.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getBooking(id: string) {
    const booking = await this.bookingRepo.findOne({
      where: { id },
      relations: ['guest', 'roomType', 'property', 'room', 'occupants'],
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return this.sanitizeBookingOccupants(booking);
  }

  private sanitizeBookingOccupants(booking: Booking): Booking {
    if (booking.occupants?.length) {
      booking.occupants = booking.occupants.map((o) => ({
        id: o.id,
        bookingId: o.bookingId,
        roomId: o.roomId,
        fullName: o.fullName,
        idDocumentType: o.idDocumentType,
        isPrimary: o.isPrimary,
        createdAt: o.createdAt,
      })) as BookingOccupant[];
    }
    return booking;
  }

  private hashIdDocument(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  }

  private normalizeCheckInOccupants(dto: CheckInDto): CheckInOccupantDto[] {
    if (dto.occupants?.length) {
      return dto.occupants.map((o) => ({
        ...o,
        fullName: o.fullName.trim(),
        idDocumentNumber: o.idDocumentNumber.replace(/\s+/g, '').trim(),
      }));
    }
    if (dto.idDocumentType && dto.idDocumentNumber?.trim()) {
      return [
        {
          fullName: '',
          idDocumentType: dto.idDocumentType,
          idDocumentNumber: dto.idDocumentNumber.replace(/\s+/g, '').trim(),
          isPrimary: true,
        },
      ];
    }
    throw new BadRequestException(
      'At least one guest with ID document is required (occupants array)',
    );
  }

  async cancelBooking(id: string, dto: CancelBookingDto, actorId: string) {
    const booking = await this.bookingRepo.findOne({ where: { id } });
    if (!booking) throw new NotFoundException('Booking not found');

    const cancellableStatuses = [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN];
    if (!cancellableStatuses.includes(booking.status)) {
      throw new BadRequestException(
        `Cannot cancel a booking with status: ${booking.status}`,
      );
    }

    // Calculate cancellation fee based on policy snapshot
    const now = new Date();
    const checkInDate = new Date(booking.checkIn);
    const hoursUntilCheckIn =
      (checkInDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    let refundAmount = booking.totalAmount || 0;
    let cancellationFee = 0;

    if (booking.policySnapshot) {
      const freeUntilHours =
        booking.policySnapshot['free_cancel_until_hours_before_checkin'] ?? 24;

      if (hoursUntilCheckIn < freeUntilHours) {
        // Apply fee rule — default: 1 night penalty
        const feeRule = booking.policySnapshot['fee_rule'];
        // Derive per-night rate from total amount and night count
        const nights = this.generateNightDates(booking.checkIn, booking.checkOut);
        const nightCount = nights.length || 1;
        const perNightRate = (booking.totalAmount || 0) / nightCount;
        cancellationFee = feeRule?.nights_penalty
          ? feeRule.nights_penalty * perNightRate
          : perNightRate;
        refundAmount = Math.max(0, (booking.totalAmount || 0) - cancellationFee);
      }
    }

    const before = { status: booking.status, paymentStatus: booking.paymentStatus };
    const wasCheckedIn = booking.status === BookingStatus.CHECKED_IN;
    const reservedRoomId = booking.roomId;

    booking.status = BookingStatus.CANCELLED;
    booking.paymentStatus =
      refundAmount > 0 ? PaymentStatus.REFUNDED : booking.paymentStatus;
    if (dto.reason) booking.notes = dto.reason;

    if (reservedRoomId) {
      if (wasCheckedIn) {
        await this.roomRepo.update(reservedRoomId, { status: RoomStatus.CLEANING });
      } else {
        await this.releaseReservedRoom(reservedRoomId);
        booking.roomId = null as any;
      }
    }

    await this.bookingRepo.save(booking);

    await this.auditRepo.save(
      this.auditRepo.create({
        actorId,
        action: 'booking.cancel',
        entityType: 'bookings',
        entityId: id,
        before,
        after: {
          status: booking.status,
          cancellationFee,
          refundAmount,
          reason: dto.reason,
        },
      }),
    );

    // Trigger push notification to guest
    try {
      await this.notificationService.sendPushNotification(
        booking.guestId,
        'booking.cancelled',
        booking.id,
      );
    } catch (notifErr) {
      this.logger.error(`Failed to send booking cancelled notification: ${notifErr.message}`);
    }

    return {
      booking,
      cancellationFee,
      refundAmount,
    };
  }

  async checkIn(id: string, dto: CheckInDto, actorId: string) {
    const booking = await this.bookingRepo.findOne({
      where: { id },
      relations: ['guest'],
    });
    if (!booking) throw new NotFoundException('Booking not found');

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException(
        `Check-in requires CONFIRMED status, got: ${booking.status}`,
      );
    }

    if (booking.paymentStatus !== PaymentStatus.PAID) {
      throw new BadRequestException(
        'Check-in requires paid booking. Complete payment first.',
      );
    }

    const occupants = this.normalizeCheckInOccupants(dto);
    for (const o of occupants) {
      if (!o.idDocumentNumber) {
        throw new BadRequestException(
          'CCCD/Passport number is required for each guest',
        );
      }
      if (!o.fullName.trim() && !o.isPrimary) {
        throw new BadRequestException('Full name is required for each guest');
      }
    }

    let primaryIdx = occupants.findIndex((o) => o.isPrimary);
    if (primaryIdx < 0) primaryIdx = 0;
    const primary = occupants[primaryIdx];
    if (!primary.fullName.trim() && booking.guest?.fullName) {
      primary.fullName = booking.guest.fullName;
    }
    if (!primary.fullName.trim()) {
      throw new BadRequestException('Primary guest name is required');
    }

    const targetRoomId = dto.roomId ?? booking.roomId;
    if (!targetRoomId) {
      throw new BadRequestException(
        'No room assigned to this booking. Confirm payment or assign a room first.',
      );
    }

    const room = await this.roomRepo.findOne({
      where: {
        id: targetRoomId,
        propertyId: booking.propertyId,
        roomTypeId: booking.roomTypeId,
      },
    });
    if (!room) throw new NotFoundException('Room not found or incompatible');

    const allowedRoomStatuses = [RoomStatus.RESERVED, RoomStatus.AVAILABLE];
    if (!allowedRoomStatuses.includes(room.status)) {
      throw new ConflictException(
        `Room ${room.roomNumber} is not ready for check-in (status: ${room.status})`,
      );
    }

    const conflicting = await this.bookingRepo.findOne({
      where: {
        roomId: targetRoomId,
        status: BookingStatus.CONFIRMED,
        id: Not(id),
      },
    });
    if (conflicting) {
      throw new ConflictException(
        `Room ${room.roomNumber} is reserved for another booking`,
      );
    }

    if (booking.roomId && booking.roomId !== targetRoomId) {
      await this.releaseReservedRoom(booking.roomId);
    }

    await this.guestService.recordIdDocument(
      booking.guestId,
      primary.idDocumentType,
      primary.idDocumentNumber,
    );
    if (primary.fullName.trim()) {
      await this.guestService.updateGuest(booking.guestId, {
        fullName: primary.fullName.trim(),
      });
    }

    booking.status = BookingStatus.CHECKED_IN;
    booking.roomId = room.id;
    await this.bookingRepo.save(booking);

    room.status = RoomStatus.OCCUPIED;
    await this.roomRepo.save(room);

    await this.occupantRepo.delete({ bookingId: id });
    for (let i = 0; i < occupants.length; i++) {
      const o = occupants[i];
      const name =
        o.fullName.trim() ||
        (i === primaryIdx ? primary.fullName.trim() : '');
      await this.occupantRepo.save(
        this.occupantRepo.create({
          bookingId: id,
          roomId: room.id,
          fullName: name,
          idDocumentType: o.idDocumentType,
          idDocumentHash: this.hashIdDocument(
            o.idDocumentNumber.toUpperCase(),
          ),
          isPrimary: i === primaryIdx,
        }),
      );
    }

    await this.auditRepo.save(
      this.auditRepo.create({
        actorId,
        action: 'booking.check_in',
        entityType: 'bookings',
        entityId: id,
        after: {
          status: booking.status,
          roomId: room.id,
          roomStatus: RoomStatus.OCCUPIED,
          occupantCount: occupants.length,
        },
      }),
    );

    return this.getBooking(id);
  }

  async checkOut(id: string, actorId: string) {
    const booking = await this.bookingRepo.findOne({ where: { id } });
    if (!booking) throw new NotFoundException('Booking not found');

    if (booking.status !== BookingStatus.CHECKED_IN) {
      throw new BadRequestException(
        `Check-out requires CHECKED_IN status, got: ${booking.status}`,
      );
    }

    const existingFinal = await this.invoiceRepo.findOne({
      where: { bookingId: id, invoiceType: InvoiceType.FINAL },
    });
    if (existingFinal) {
      throw new BadRequestException('Final invoice already created for this booking');
    }

    const [charges, deposit] = await Promise.all([
      this.chargeRepo.find({ where: { bookingId: id, status: BookingChargeStatus.POSTED } }),
      this.invoiceRepo.findOne({ where: { bookingId: id, invoiceType: InvoiceType.DEPOSIT } }),
    ]);

    const roomTotal = Number(booking.totalAmount || 0);
    const chargesTotal = charges.reduce((sum, c) => sum + Number(c.amount || 0), 0);
    const grandTotal = roomTotal + chargesTotal;

    const finalInvoice = await this.invoiceRepo.save(
      this.invoiceRepo.create({
        bookingId: id,
        totalAmount: grandTotal,
        invoiceType: InvoiceType.FINAL,
        paymentStatus: InvoicePaymentStatus.PENDING,
      }),
    );

    const before = { status: booking.status };
    booking.status = BookingStatus.CHECKED_OUT;
    await this.bookingRepo.save(booking);

    // Set room to cleaning
    if (booking.roomId) {
      await this.roomRepo.update(booking.roomId, { status: RoomStatus.CLEANING });
    }

    await this.auditRepo.save(
      this.auditRepo.create({
        actorId,
        action: 'booking.check_out',
        entityType: 'bookings',
        entityId: id,
        before,
        after: { status: booking.status, finalInvoiceId: finalInvoice.id },
      }),
    );

    // Trigger push notification to guest
    try {
      await this.notificationService.sendPushNotification(
        booking.guestId,
        'booking.checkout',
        booking.id,
      );
    } catch (notifErr) {
      this.logger.error(`Failed to send booking checkout notification: ${notifErr.message}`);
    }

    return {
      booking,
      depositInvoice: deposit || null,
      finalInvoice,
      totals: { roomTotal, chargesTotal, grandTotal },
    };
  }

  async markNoShow(id: string, actorId: string) {
    const booking = await this.bookingRepo.findOne({ where: { id } });
    if (!booking) throw new NotFoundException('Booking not found');

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException(
        `No-show requires CONFIRMED status, got: ${booking.status}`,
      );
    }

    booking.status = BookingStatus.NO_SHOW;
    if (booking.roomId) {
      await this.releaseReservedRoom(booking.roomId);
      booking.roomId = null as any;
    }
    await this.bookingRepo.save(booking);

    await this.auditRepo.save(
      this.auditRepo.create({
        actorId,
        action: 'booking.no_show',
        entityType: 'bookings',
        entityId: id,
        after: { status: booking.status },
      }),
    );

    return booking;
  }

  async getRoomFolio(propertyId: string, roomId: string) {
    const room = await this.roomRepo.findOne({
      where: { id: roomId, propertyId },
      relations: ['roomType'],
    });
    if (!room) throw new NotFoundException('Room not found');

    const booking = await this.bookingRepo.findOne({
      where: { propertyId, roomId, status: BookingStatus.CHECKED_IN } as any,
      relations: ['guest', 'roomType', 'occupants'],
      order: { createdAt: 'DESC' } as any,
    });

    if (!booking) {
      return {
        room,
        booking: null,
        occupants: [],
        charges: [],
        depositInvoice: null,
        finalInvoice: null,
        totals: { roomTotal: 0, chargesTotal: 0, grandTotal: 0 },
      };
    }

    const [charges, depositInvoice, finalInvoice] = await Promise.all([
      this.chargeRepo.find({
        where: { bookingId: booking.id } as any,
        order: { createdAt: 'DESC' } as any,
      }),
      this.invoiceRepo.findOne({
        where: { bookingId: booking.id, invoiceType: InvoiceType.DEPOSIT } as any,
        order: { issuedAt: 'DESC' } as any,
      }),
      this.invoiceRepo.findOne({
        where: { bookingId: booking.id, invoiceType: InvoiceType.FINAL } as any,
        order: { issuedAt: 'DESC' } as any,
      }),
    ]);

    const roomTotal = Number(booking.totalAmount || 0);
    const chargesTotal = charges
      .filter((c) => c.status === BookingChargeStatus.POSTED)
      .reduce((sum, c) => sum + Number(c.amount || 0), 0);
    const grandTotal = roomTotal + chargesTotal;

    return {
      room,
      booking: this.sanitizeBookingOccupants(booking),
      occupants: (booking.occupants || []) as any,
      charges,
      depositInvoice: depositInvoice || null,
      finalInvoice: finalInvoice || null,
      totals: { roomTotal, chargesTotal, grandTotal },
    };
  }

  // ─── Cancellation Policies ─────────────────────────────────────────────────

  async createCancellationPolicy(
    propertyId: string,
    dto: CreateCancellationPolicyDto,
    actorId: string,
  ) {
    const property = await this.propertyRepo.findOne({ where: { id: propertyId } });
    if (!property) throw new NotFoundException('Property not found');

    // De-activate existing active policies for this property
    await this.policyRepo.update({ propertyId, isActive: true }, { isActive: false });

    // Determine the next version
    const latestPolicy = await this.policyRepo.findOne({
      where: { propertyId },
      order: { policyVersion: 'DESC' },
    });
    const nextVersion = latestPolicy ? latestPolicy.policyVersion + 1 : 1;

    const policy = this.policyRepo.create({
      propertyId,
      ...dto,
      policyVersion: nextVersion,
      isActive: true,
    });

    const saved = await this.policyRepo.save(policy);

    await this.auditRepo.save(
      this.auditRepo.create({
        actorId,
        action: 'cancellation_policy.create',
        entityType: 'cancellation_policies',
        entityId: saved.id,
        after: saved as any,
      }),
    );

    return saved;
  }

  async getCancellationPolicies(propertyId: string) {
    return this.policyRepo.find({
      where: { propertyId },
      order: { policyVersion: 'DESC' },
    });
  }

  async getActiveCancellationPolicy(propertyId: string) {
    const policy = await this.policyRepo.findOne({
      where: { propertyId, isActive: true },
      order: { createdAt: 'DESC' },
    });
    if (!policy) throw new NotFoundException('No active cancellation policy found');
    return policy;
  }

  async updateCancellationPolicy(
    propertyId: string,
    policyId: string,
    dto: UpdateCancellationPolicyDto,
    actorId: string,
  ) {
    const policy = await this.policyRepo.findOne({
      where: { id: policyId, propertyId },
    });
    if (!policy) throw new NotFoundException('Cancellation policy not found');

    const before = { ...policy };
    Object.assign(policy, dto);

    const saved = await this.policyRepo.save(policy);

    await this.auditRepo.save(
      this.auditRepo.create({
        actorId,
        action: 'cancellation_policy.update',
        entityType: 'cancellation_policies',
        entityId: policyId,
        before: before as any,
        after: saved as any,
      }),
    );

    return saved;
  }

  // ─── Active Holds (admin monitor) ─────────────────────────────────────────

  async listActiveHolds(propertyId?: string) {
    const qb = this.holdRepo
      .createQueryBuilder('hold')
      .where('hold.released_at IS NULL')
      .andWhere('hold.expires_at > :now', { now: new Date() })
      .leftJoinAndSelect('hold.roomType', 'roomType')
      .orderBy('hold.expires_at', 'ASC');

    if (propertyId) qb.andWhere('hold.property_id = :propertyId', { propertyId });
    return qb.getMany();
  }

  // ─── Digital Check-in (QR / PIN) ──────────────────────────────────────────

  async generateCheckinToken(bookingId: string, actorId: string) {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId },
      relations: ['guest', 'property'],
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException(
        `Check-in token requires CONFIRMED booking, current status: ${booking.status}`,
      );
    }

    // Signed JWT — expires in 24h, payload identifies booking
    const token = this.jwtService.sign(
      { bookingId, type: 'checkin' },
      {
        secret: this.config.get<string>('jwt.accessSecret'),
        expiresIn: '24h',
      },
    );

    // 6-digit PIN (plaintext returned once, then hashed for storage)
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    const pinHash = await bcrypt.hash(pin, 10);

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    booking.checkinToken = token;
    booking.checkinPin = pinHash;
    booking.checkinTokenExpiresAt = expiresAt;
    await this.bookingRepo.save(booking);

    await this.auditRepo.save(
      this.auditRepo.create({
        actorId,
        action: 'booking.generate_checkin_token',
        entityType: 'bookings',
        entityId: bookingId,
        after: { tokenGeneratedAt: new Date(), expiresAt } as any,
      }),
    );

    // Generate QR data URL (base64 PNG) — non-blocking
    let qrDataUrl = '';
    try {
      qrDataUrl = await QRCode.toDataURL(token, { width: 250, margin: 2 });
    } catch (qrErr) {
      this.logger.error(`QR generation error: ${qrErr.message}`);
    }

    // Send email with QR + PIN — non-blocking (fire and forget)
    const guestEmail = (booking as any).guest?.email;
    const guestName = (booking as any).guest?.fullName ?? 'Quý khách';
    const propertyName = (booking as any).property?.name ?? 'Mango Hotel';
    if (guestEmail) {
      this.mailService
        .sendCheckinCredentials({
          to: guestEmail,
          guestName,
          bookingId: booking.id,
          pin,
          qrDataUrl,
          expiresAt,
          propertyName,
        })
        .catch((err) =>
          this.logger.error(`Email send error: ${err.message}`),
        );
    }

    return {
      token,
      pin, // plaintext — shown once, not stored
      expiresAt,
      qrDataUrl,
    };
  }

  async selfCheckIn(dto: { token?: string; pin?: string; bookingId?: string }) {
    let booking: Booking | null = null;

    if (dto.token) {
      // ── Validate JWT token ───────────────────────────────────────────────
      let payload: any;
      try {
        payload = this.jwtService.verify(dto.token, {
          secret: this.config.get<string>('jwt.accessSecret'),
        });
      } catch {
        throw new UnauthorizedException('Check-in token is invalid or expired');
      }
      if (payload.type !== 'checkin') {
        throw new UnauthorizedException('Token type mismatch');
      }

      booking = await this.bookingRepo.findOne({
        where: { id: payload.bookingId, checkinToken: dto.token },
      });
    } else if (dto.pin && dto.bookingId) {
      // ── Validate 6-digit PIN ──────────────────────────────────────────────
      booking = await this.bookingRepo.findOne({
        where: { id: dto.bookingId },
      });
      if (!booking) throw new NotFoundException('Booking not found');
      if (!booking.checkinPin) {
        throw new BadRequestException('No check-in PIN generated for this booking');
      }
      const pinValid = await bcrypt.compare(dto.pin, booking.checkinPin);
      if (!pinValid) throw new UnauthorizedException('Invalid PIN');
    } else {
      throw new BadRequestException('Provide either token OR (pin + bookingId)');
    }

    if (!booking) throw new NotFoundException('Booking not found');

    if (
      booking.checkinTokenExpiresAt &&
      booking.checkinTokenExpiresAt < new Date()
    ) {
      throw new BadRequestException('Check-in credentials have expired');
    }

    throw new BadRequestException(
      'Vui lòng check-in tại quầy lễ tân với CCCD/Hộ chiếu để đăng ký tạm trú tạm vắng.',
    );
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /** Exposed for public booking quote / hold night lists */
  generateNightDatesPublic(from: string, to: string): string[] {
    return this.generateNightDates(from, to);
  }

  /** Normalize DB/API date values to YYYY-MM-DD */
  private toDateString(value: unknown): string {
    if (value instanceof Date) {
      return this.formatDateOnly(value);
    }
    if (typeof value === 'string') {
      return value.includes('T') ? value.split('T')[0] : value.slice(0, 10);
    }
    if (value && typeof value === 'object') {
      const v = value as Record<string, number>;
      if ('year' in v && 'month' in v && 'day' in v) {
        const m = String(v.month).padStart(2, '0');
        const d = String(v.day).padStart(2, '0');
        return `${v.year}-${m}-${d}`;
      }
    }
    const s = String(value);
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      return s.slice(0, 10);
    }
    throw new BadRequestException(`Invalid date value: ${s}`);
  }

  /** Calendar dates (YYYY-MM-DD) without local/UTC drift */
  private parseDateOnly(dateStr: string | Date): Date {
    const normalized = this.toDateString(dateStr);
    const [y, m, d] = normalized.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  }

  private formatDateOnly(d: Date): string {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private generateNightDates(from: string, to: string): string[] {
    const dates: string[] = [];
    let current = this.parseDateOnly(from);
    const end = this.parseDateOnly(to);
    while (current < end) {
      dates.push(this.formatDateOnly(current));
      current = new Date(current.getTime() + 86_400_000);
    }
    return dates;
  }

  private addDays(dateStr: string | Date, days: number): string {
    const d = this.parseDateOnly(dateStr);
    d.setUTCDate(d.getUTCDate() + days);
    return this.formatDateOnly(d);
  }

  private async checkIdempotency(
    key: string,
    userId: string,
    requestHash: string,
  ) {
    const existing = await this.idempotencyRepo.findOne({
      where: { key, userId },
    });
    if (existing) {
      if (existing.requestHash !== requestHash) {
        throw new ConflictException(
          'Idempotency key reused with different payload',
        );
      }
      return existing.responseJson;
    }
    return null;
  }

  private async saveIdempotency(
    key: string,
    userId: string,
    requestHash: string,
    responseJson: any,
  ) {
    await this.idempotencyRepo.save(
      this.idempotencyRepo.create({ key, userId, requestHash, responseJson }),
    );
  }
}
