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
  MoreThan,
} from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
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
    private dataSource: DataSource,
    private notificationService: NotificationService,
    private jwtService: JwtService,
    private config: ConfigService,
    private mailService: MailService,
  ) {}

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

        // Only count holds that are still valid (not expired, not released)
        const activeHolds = await em.count(BookingHold, {
          where: {
            propertyId,
            roomTypeId: rt.id,
            releasedAt: IsNull(),
            expiresAt: MoreThan(now),
          },
        });

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

      // Reuse computeAvailability inside the same transaction / EntityManager
      const avail = await this.computeAvailability(
        dto.propertyId,
        dto.nights[0],
        dto.nights[dto.nights.length - 1],
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

      const checkInDate = hold.nights[0];
      const checkOutDate = this.addDays(hold.nights[hold.nights.length - 1], 1);

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
      for (const night of hold.nights) {
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

  async listBookings(query: ListBookingsQueryDto) {
    const {
      propertyId,
      status,
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
      .select([
        'booking',
        'guest.id',
        'guest.email',
        'guest.fullName',
        'roomType.id',
        'roomType.name',
        'property.id',
        'property.name',
      ]);

    if (propertyId) qb.andWhere('booking.propertyId = :propertyId', { propertyId });
    if (status) qb.andWhere('booking.status = :status', { status });
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
      relations: ['guest', 'roomType', 'property', 'room'],
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
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

    booking.status = BookingStatus.CANCELLED;
    booking.paymentStatus =
      refundAmount > 0 ? PaymentStatus.REFUNDED : booking.paymentStatus;
    if (dto.reason) booking.notes = dto.reason;

    await this.bookingRepo.save(booking);

    // Release associated room if checked-in
    if (booking.roomId) {
      await this.roomRepo.update(booking.roomId, { status: RoomStatus.CLEANING });
    }

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
    const booking = await this.bookingRepo.findOne({ where: { id } });
    if (!booking) throw new NotFoundException('Booking not found');

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException(
        `Check-in requires CONFIRMED status, got: ${booking.status}`,
      );
    }

    // Find or validate room assignment
    let room: Room | null = null;
    if (dto.roomId) {
      room = await this.roomRepo.findOne({
        where: {
          id: dto.roomId,
          propertyId: booking.propertyId,
          roomTypeId: booking.roomTypeId,
        },
      });
      if (!room) throw new NotFoundException('Room not found or incompatible');
    } else {
      // Auto-assign first available room of the right type
      room = await this.roomRepo.findOne({
        where: {
          propertyId: booking.propertyId,
          roomTypeId: booking.roomTypeId,
          status: RoomStatus.AVAILABLE,
        },
      });
    }

    if (!room) {
      throw new ConflictException('No available room found for check-in');
    }

    // State transitions
    booking.status = BookingStatus.CHECKED_IN;
    booking.roomId = room.id;
    await this.bookingRepo.save(booking);

    room.status = RoomStatus.OCCUPIED;
    await this.roomRepo.save(room);

    await this.auditRepo.save(
      this.auditRepo.create({
        actorId,
        action: 'booking.check_in',
        entityType: 'bookings',
        entityId: id,
        after: { status: booking.status, roomId: room.id },
      }),
    );

    return booking;
  }

  async checkOut(id: string, actorId: string) {
    const booking = await this.bookingRepo.findOne({ where: { id } });
    if (!booking) throw new NotFoundException('Booking not found');

    if (booking.status !== BookingStatus.CHECKED_IN) {
      throw new BadRequestException(
        `Check-out requires CHECKED_IN status, got: ${booking.status}`,
      );
    }

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
        after: { status: booking.status },
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

    return booking;
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

    // Reuse existing checkIn logic (auto-assigns available room)
    return this.checkIn(booking.id, {}, 'self-checkin');
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private generateNightDates(from: string, to: string): string[] {
    const dates: string[] = [];
    let current = new Date(from);
    const end = new Date(to);
    while (current < end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }

  private addDays(dateStr: string, days: number): string {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
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
