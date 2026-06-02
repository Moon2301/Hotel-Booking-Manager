import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentEvent } from './entities/payment-event.entity';
import { PaymentTransaction } from './entities/payment-transaction.entity';
import { Booking } from '../booking/entities/booking.entity';
import { Invoice } from '../booking/entities/invoice.entity';
import { AuditLog } from '../auth/entities/audit-log.entity';
import { PaymentService } from './payment.service';
import { VnpayService } from './vnpay.service';
import { InvoiceService } from '../booking/invoice.service';
import { PaymentController } from './payment.controller';
import { ReconciliationTicket } from '../booking/entities/reconciliation-ticket.entity';
import { ReconciliationService } from './reconciliation.service';
import { BookingModule } from '../booking/booking.module';
import { PartnerModule } from '../partner/partner.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PaymentEvent,
      PaymentTransaction,
      Booking,
      Invoice,
      AuditLog,
      ReconciliationTicket,
    ]),
    forwardRef(() => BookingModule),
    PartnerModule,
  ],
  controllers: [PaymentController],
  providers: [
    PaymentService,
    VnpayService,
    InvoiceService,
    ReconciliationService,
  ],
  exports: [PaymentService, VnpayService, ReconciliationService],
})
export class PaymentModule {}
