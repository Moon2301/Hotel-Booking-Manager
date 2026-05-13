import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentEvent } from './entities/payment-event.entity';
import { PaymentTransaction } from './entities/payment-transaction.entity';
import { Booking } from '../booking/entities/booking.entity';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PaymentEvent, PaymentTransaction, Booking])],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
