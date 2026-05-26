import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from './entities/booking.entity';
import { BookingOccupant } from './entities/booking-occupant.entity';
import { BookingHold } from './entities/booking-hold.entity';
import { BookingLineItem } from './entities/booking-line-item.entity';
import { IdempotencyKey } from './entities/idempotency-key.entity';
import { CancellationPolicy } from './entities/cancellation-policy.entity';
import { Invoice } from './entities/invoice.entity';
import { ServiceItem } from './entities/service-item.entity';
import { BookingCharge } from './entities/booking-charge.entity';
import { ReconciliationTicket } from './entities/reconciliation-ticket.entity';
import { Property } from '../property/entities/property.entity';
import { Room } from '../property/entities/room.entity';
import { RoomType } from '../property/entities/room-type.entity';
import { DailyRate } from '../pricing/entities/daily-rate.entity';
import { AuditLog } from '../auth/entities/audit-log.entity';
import { User } from '../auth/entities/user.entity';
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
import { PublicBookingController } from './public-booking.controller';
import { PublicBookingService } from './public-booking.service';
import { BookingConfirmationService } from './booking-confirmation.service';
import { PaymentModule } from '../payment/payment.module';
import { ServiceCatalogController } from './service-catalog.controller';
import { BookingChargesController } from './booking-charges.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Booking,
      BookingOccupant,
      BookingHold,
      BookingLineItem,
      IdempotencyKey,
      CancellationPolicy,
      Invoice,
      ServiceItem,
      BookingCharge,
      ReconciliationTicket,
      Property,
      Room,
      RoomType,
      DailyRate,
      AuditLog,
      Guest,
      User,
    ]),
    NotificationModule,
    GuestModule,
    AuthModule,
    forwardRef(() => PaymentModule),
  ],
  controllers: [
    BookingController,
    InvoiceController,
    PublicBookingController,
    ServiceCatalogController,
    BookingChargesController,
  ],
  providers: [
    BookingService,
    InvoiceService,
    MailService,
    ReportingService,
    PublicBookingService,
    BookingConfirmationService,
  ],
  exports: [
    BookingService,
    InvoiceService,
    MailService,
    BookingConfirmationService,
    TypeOrmModule,
    ReportingService,
  ],
})
export class BookingModule {}

