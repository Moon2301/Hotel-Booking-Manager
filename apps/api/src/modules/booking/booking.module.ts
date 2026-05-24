import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from './entities/booking.entity';
import { BookingHold } from './entities/booking-hold.entity';
import { BookingLineItem } from './entities/booking-line-item.entity';
import { IdempotencyKey } from './entities/idempotency-key.entity';
import { CancellationPolicy } from './entities/cancellation-policy.entity';
import { Invoice } from './entities/invoice.entity';
import { ReconciliationTicket } from './entities/reconciliation-ticket.entity';
import { Property } from '../property/entities/property.entity';
import { Room } from '../property/entities/room.entity';
import { RoomType } from '../property/entities/room-type.entity';
import { DailyRate } from '../pricing/entities/daily-rate.entity';
import { AuditLog } from '../auth/entities/audit-log.entity';
import { Guest } from '../guest/entities/guest.entity';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';
import { InvoiceService } from './invoice.service';
import { InvoiceController } from './invoice.controller';
import { NotificationModule } from '../notification/notification.module';
import { GuestModule } from '../guest/guest.module';
import { AuthModule } from '../auth/auth.module';
import { MailService } from './mail.service';
import { ReportingService } from './reporting.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Booking,
      BookingHold,
      BookingLineItem,
      IdempotencyKey,
      CancellationPolicy,
      Invoice,
      ReconciliationTicket,
      Property,
      Room,
      RoomType,
      DailyRate,
      AuditLog,
      Guest,
    ]),
    NotificationModule,
    GuestModule,
    AuthModule,
  ],
  controllers: [BookingController, InvoiceController],
  providers: [BookingService, InvoiceService, MailService, ReportingService],
  exports: [BookingService, InvoiceService, TypeOrmModule, ReportingService],
})
export class BookingModule {}

