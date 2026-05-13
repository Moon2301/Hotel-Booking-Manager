import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PaymentEvent, PaymentOutcome } from './entities/payment-event.entity';
import { PaymentTransaction } from './entities/payment-transaction.entity';
import { Booking, PaymentStatus } from '../booking/entities/booking.entity';
import { CreatePaymentIntentDto, PaymentWebhookDto, WebhookProvider } from './dto/payment.dto';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @InjectRepository(PaymentEvent) private eventRepo: Repository<PaymentEvent>,
    @InjectRepository(PaymentTransaction) private txRepo: Repository<PaymentTransaction>,
    @InjectRepository(Booking) private bookingRepo: Repository<Booking>,
    private dataSource: DataSource,
    private config: ConfigService,
  ) {}

  async createIntent(dto: CreatePaymentIntentDto) {
    const booking = await this.bookingRepo.findOne({ where: { id: dto.bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');

    // Here we would integrate with Stripe/VNPay/MoMo to create an intent
    // For MVP, we mock the creation and return a dummy client secret
    
    const tx = this.txRepo.create({
      bookingId: dto.bookingId,
      amount: dto.amount,
      currency: 'VND',
      providerRef: `mock_intent_${Date.now()}`,
    });
    
    await this.txRepo.save(tx);

    return {
      clientSecret: 'mock_client_secret',
      transactionId: tx.id,
    };
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    const secret = this.config.get<string>('payment.webhookSecret');
    if (!secret) return false;

    const expectedSig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    return expectedSig === signature;
  }

  async handleWebhook(dto: PaymentWebhookDto, rawPayload: string) {
    // 1. Check idempotency of the event
    const payloadHash = crypto.createHash('sha256').update(rawPayload).digest('hex');
    const existingEvent = await this.eventRepo.findOne({ where: { eventId: dto.eventId } });
    
    if (existingEvent) {
      this.logger.log(`Webhook event ${dto.eventId} already processed.`);
      return { success: true, duplicate: true }; // No-op, return 200
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 2. Insert event first
      const outcome = dto.status === 'SUCCESS' ? PaymentOutcome.SUCCESS : PaymentOutcome.FAILED;
      const event = queryRunner.manager.create(PaymentEvent, {
        eventId: dto.eventId,
        provider: dto.provider,
        payloadHash,
        outcome,
      });
      await queryRunner.manager.save(event);

      // 3. Update Transaction and Booking
      const booking = await queryRunner.manager.findOne(Booking, { where: { id: dto.bookingId } });
      if (booking) {
        if (outcome === PaymentOutcome.SUCCESS) {
          booking.paymentStatus = PaymentStatus.PAID;
          // In a real system, we also update the transaction table with the provider reference here
        } else {
          booking.paymentStatus = PaymentStatus.FAILED;
        }
        await queryRunner.manager.save(booking);
      }

      await queryRunner.commitTransaction();
      return { success: true };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error processing webhook: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
