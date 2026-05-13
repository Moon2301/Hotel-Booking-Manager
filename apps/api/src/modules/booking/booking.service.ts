import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThan, IsNull } from 'typeorm';
import { Booking, BookingStatus, PaymentStatus } from './entities/booking.entity';
import { BookingHold } from './entities/booking-hold.entity';
import { BookingLineItem } from './entities/booking-line-item.entity';
import { IdempotencyKey } from './entities/idempotency-key.entity';
import { CancellationPolicy } from './entities/cancellation-policy.entity';
import { CreateHoldDto, ConfirmBookingDto, AvailabilityQueryDto } from './dto/booking.dto';
import { AuditLog } from '../auth/entities/audit-log.entity';
import { Property } from '../property/entities/property.entity';

@Injectable()
export class BookingService {
  constructor(
    @InjectRepository(Booking) private bookingRepo: Repository<Booking>,
    @InjectRepository(BookingHold) private holdRepo: Repository<BookingHold>,
    @InjectRepository(BookingLineItem) private lineItemRepo: Repository<BookingLineItem>,
    @InjectRepository(IdempotencyKey) private idempotencyRepo: Repository<IdempotencyKey>,
    @InjectRepository(CancellationPolicy) private policyRepo: Repository<CancellationPolicy>,
    @InjectRepository(Property) private propertyRepo: Repository<Property>,
    @InjectRepository(AuditLog) private auditRepo: Repository<AuditLog>,
    private dataSource: DataSource,
  ) {}

  async checkAvailability(query: AvailabilityQueryDto) {
    // Basic implementation: check total rooms of type minus active bookings and holds
    // For MVP, just returning an empty response structure. In a real scenario, this involves 
    // joining rooms, bookings, holds, and daily rates to find available inventory.
    return { available: true, message: 'Availability check requires complex inventory query (to be implemented fully)' };
  }

  async createHold(dto: CreateHoldDto) {
    const property = await this.propertyRepo.findOne({ where: { id: dto.propertyId } });
    if (!property) throw new NotFoundException('Property not found');

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

  async releaseHold(id: string) {
    const hold = await this.holdRepo.findOne({ where: { id, releasedAt: IsNull() } });
    if (!hold) return { success: true, message: 'Hold already released or not found' };

    hold.releasedAt = new Date();
    await this.holdRepo.save(hold);
    return { success: true };
  }

  // Idempotency check helper
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

  async createBooking(idempotencyKey: string, dto: ConfirmBookingDto, requestHash: string, actorId: string) {
    // 1. Check idempotency
    const cachedResponse = await this.checkIdempotency(idempotencyKey, actorId, requestHash);
    if (cachedResponse) return cachedResponse;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 2. Fetch hold
      const hold = await queryRunner.manager.findOne(BookingHold, { 
        where: { id: dto.holdId },
        lock: { mode: 'pessimistic_write' } // Prevent concurrent access to this hold
      });

      if (!hold) throw new NotFoundException('Hold not found');
      if (hold.releasedAt) throw new BadRequestException('Hold already released');
      if (hold.expiresAt < new Date()) throw new BadRequestException('Hold expired');
      if (hold.bookingId) throw new BadRequestException('Hold already converted to booking');

      // 3. Fetch active cancellation policy
      const policy = await queryRunner.manager.findOne(CancellationPolicy, {
        where: { propertyId: hold.propertyId, isActive: true },
        order: { createdAt: 'DESC' }
      });

      // 4. Create Booking
      const checkInDate = hold.nights[0];
      const checkOutDate = new Date(hold.nights[hold.nights.length - 1]);
      checkOutDate.setDate(checkOutDate.getDate() + 1); // Checkout is day after last night

      const booking = queryRunner.manager.create(Booking, {
        propertyId: hold.propertyId,
        roomTypeId: hold.roomTypeId,
        guestId: dto.guestId,
        status: BookingStatus.CONFIRMED,
        checkIn: checkInDate,
        checkOut: checkOutDate.toISOString().split('T')[0],
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

      // 5. Update Hold
      hold.bookingId = savedBooking.id;
      hold.releasedAt = new Date(); // Effectively consumed
      await queryRunner.manager.save(hold);

      // 6. Snapshot Line Items (Simplified - would normally fetch rates)
      // Here we assume daily rates are fetched and snapshotted. For MVP we mock 1 item.
      const lineItem = queryRunner.manager.create(BookingLineItem, {
        bookingId: savedBooking.id,
        night: hold.nights[0],
        unitPrice: 1000000, // mock price
        currency: 'VND'
      });
      await queryRunner.manager.save(lineItem);

      // Update total on booking
      savedBooking.totalAmount = 1000000;
      await queryRunner.manager.save(savedBooking);

      // 7. Audit log
      await queryRunner.manager.save(AuditLog, queryRunner.manager.create(AuditLog, {
        actorId,
        action: 'booking.create',
        entityType: 'bookings',
        entityId: savedBooking.id,
        after: savedBooking as any,
      }));

      await queryRunner.commitTransaction();

      // 8. Save idempotency
      await this.saveIdempotency(idempotencyKey, actorId, requestHash, savedBooking);

      return savedBooking;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async getBooking(id: string) {
    const booking = await this.bookingRepo.findOne({ where: { id } });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }
}
