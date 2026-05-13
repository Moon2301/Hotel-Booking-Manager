import { Injectable, ConflictException, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThan, IsNull, In, Not } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Booking, BookingStatus, PaymentStatus } from './entities/booking.entity';
import { BookingHold } from './entities/booking-hold.entity';
import { BookingLineItem } from './entities/booking-line-item.entity';
import { IdempotencyKey } from './entities/idempotency-key.entity';
import { CancellationPolicy } from './entities/cancellation-policy.entity';
import { CreateHoldDto, ConfirmBookingDto, AvailabilityQueryDto } from './dto/booking.dto';
import { AuditLog } from '../auth/entities/audit-log.entity';
import { Property } from '../property/entities/property.entity';
import { Room } from '../property/entities/room.entity';
import { RoomType } from '../property/entities/room-type.entity';
import { DailyRate } from '../pricing/entities/daily-rate.entity';

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
    @InjectRepository(BookingLineItem) private lineItemRepo: Repository<BookingLineItem>,
    @InjectRepository(IdempotencyKey) private idempotencyRepo: Repository<IdempotencyKey>,
    @InjectRepository(CancellationPolicy) private policyRepo: Repository<CancellationPolicy>,
    @InjectRepository(Property) private propertyRepo: Repository<Property>,
    @InjectRepository(Room) private roomRepo: Repository<Room>,
    @InjectRepository(RoomType) private roomTypeRepo: Repository<RoomType>,
    @InjectRepository(DailyRate) private dailyRateRepo: Repository<DailyRate>,
    @InjectRepository(AuditLog) private auditRepo: Repository<AuditLog>,
    private dataSource: DataSource,
  ) {}

  async checkAvailability(query: AvailabilityQueryDto): Promise<AvailabilityResult[]> {
    const { propertyId, from, to } = query;
    const nights = this.generateNightDates(from, to);
    
    const roomTypes = await this.roomTypeRepo.find({ where: { propertyId } });
    const results: AvailabilityResult[] = [];

    for (const rt of roomTypes) {
      const totalRooms = await this.roomRepo.count({ where: { propertyId, roomTypeId: rt.id } });
      
      let minAvailable = totalRooms;
      for (const night of nights) {
        const activeBookings = await this.bookingRepo.count({
          where: {
            propertyId,
            roomTypeId: rt.id,
            status: In([BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN]),
            checkIn: LessThan(this.addDays(night, 1)),
            checkOut: Not(LessThan(this.addDays(night, 1))),
          } as any
        });

        const activeHolds = await this.holdRepo.count({
          where: {
            propertyId,
            roomTypeId: rt.id,
            releasedAt: IsNull(),
            expiresAt: Not(LessThan(new Date())),
            nights: In([night])
          } as any
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

  async createHold(dto: CreateHoldDto) {
    const property = await this.propertyRepo.findOne({ where: { id: dto.propertyId } });
    if (!property) throw new NotFoundException('Property not found');

    const avail = await this.checkAvailability({
      propertyId: dto.propertyId,
      from: dto.nights[0],
      to: dto.nights[dto.nights.length - 1]
    });
    const rtAvail = avail.find(a => a.roomTypeId === dto.roomTypeId);
    if (!rtAvail || rtAvail.available <= 0) {
      throw new ConflictException('No rooms available for the selected dates');
    }

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + property.holdTtlSeconds);

    const hold = this.holdRepo.create({
      propertyId: dto.propertyId,
      roomTypeId: dto.roomTypeId,
      nights: dto.nights,
      expiresAt,
    });

    return this.holdRepo.save(hold);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async cleanupExpiredHolds() {
    this.logger.log('Running cleanup job for expired holds...');
    const result = await this.holdRepo
      .createQueryBuilder()
      .update()
      .set({ releasedAt: new Date() })
      .where('expires_at < :now AND released_at IS NULL AND booking_id IS NULL', { now: new Date() })
      .execute();
    
    if (result.affected && result.affected > 0) {
      this.logger.log(`Released ${result.affected} expired holds`);
    }
  }

  async createBooking(idempotencyKey: string, dto: ConfirmBookingDto, requestHash: string, actorId: string) {
    const cachedResponse = await this.checkIdempotency(idempotencyKey, actorId, requestHash);
    if (cachedResponse) return cachedResponse;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const hold = await queryRunner.manager.findOne(BookingHold, { 
        where: { id: dto.holdId },
        lock: { mode: 'pessimistic_write' }
      });

      if (!hold) throw new NotFoundException('Hold not found');
      if (hold.releasedAt) throw new BadRequestException('Hold already released');
      if (hold.expiresAt < new Date()) throw new BadRequestException('Hold expired');
      if (hold.bookingId) throw new BadRequestException('Hold already converted to booking');

      const rt = await queryRunner.manager.findOne(RoomType, { where: { id: hold.roomTypeId } });
      const policy = await queryRunner.manager.findOne(CancellationPolicy, {
        where: { propertyId: hold.propertyId, isActive: true },
        order: { createdAt: 'DESC' }
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
        policySnapshot: policy ? {
          free_cancel_until_hours_before_checkin: policy.freeCancelUntilHoursBeforeCheckin,
          fee_rule: policy.feeRuleRef,
          no_show_rule: policy.noShowRule,
          policy_version: policy.policyVersion,
          snapshotted_at: new Date().toISOString()
        } : undefined
      });

      const savedBooking = await queryRunner.manager.save(booking);

      hold.bookingId = savedBooking.id;
      hold.releasedAt = new Date();
      await queryRunner.manager.save(hold);

      let totalAmount = 0;
      for (const night of hold.nights) {
        const rate = await queryRunner.manager.findOne(DailyRate, {
          where: { propertyId: hold.propertyId, roomTypeId: hold.roomTypeId, night }
        });
        
        const unitPrice = rate ? Number(rate.amount) : Number(rt?.basePrice || 0);
        const lineItem = queryRunner.manager.create(BookingLineItem, {
          bookingId: savedBooking.id,
          night,
          unitPrice,
          currency: rate?.currency || 'VND'
        });
        await queryRunner.manager.save(lineItem);
        totalAmount += unitPrice;
      }

      savedBooking.totalAmount = totalAmount;
      await queryRunner.manager.save(savedBooking);

      await queryRunner.manager.save(AuditLog, queryRunner.manager.create(AuditLog, {
        actorId,
        action: 'booking.create',
        entityType: 'bookings',
        entityId: savedBooking.id,
        after: savedBooking as any,
      }));

      await queryRunner.commitTransaction();
      await this.saveIdempotency(idempotencyKey, actorId, requestHash, savedBooking);
      return savedBooking;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

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

  private async checkIdempotency(key: string, userId: string, requestHash: string) {
    const existing = await this.idempotencyRepo.findOne({ where: { key, userId } });
    if (existing) {
      if (existing.requestHash !== requestHash) {
        throw new ConflictException('Idempotency key reused with different payload');
      }
      return existing.responseJson;
    }
    return null;
  }

  private async saveIdempotency(key: string, userId: string, requestHash: string, responseJson: any) {
    await this.idempotencyRepo.save(this.idempotencyRepo.create({
      key,
      userId,
      requestHash,
      responseJson,
    }));
  }

  async getBooking(id: string) {
    const booking = await this.bookingRepo.findOne({ where: { id } });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  async releaseHold(id: string) {
    const hold = await this.holdRepo.findOne({ where: { id, releasedAt: IsNull() } });
    if (!hold) return { success: true, message: 'Hold already released or not found' };

    hold.releasedAt = new Date();
    await this.holdRepo.save(hold);
    return { success: true };
  }
}
