import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from './entities/booking.entity';
import { BookingHold } from './entities/booking-hold.entity';
import { BookingLineItem } from './entities/booking-line-item.entity';
import { IdempotencyKey } from './entities/idempotency-key.entity';
import { CancellationPolicy } from './entities/cancellation-policy.entity';
import { Property } from '../property/entities/property.entity';
import { AuditLog } from '../auth/entities/audit-log.entity';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Booking,
      BookingHold,
      BookingLineItem,
      IdempotencyKey,
      CancellationPolicy,
      Property,
      AuditLog,
    ]),
  ],
  controllers: [BookingController],
  providers: [BookingService],
  exports: [BookingService, TypeOrmModule],
})
export class BookingModule {}
