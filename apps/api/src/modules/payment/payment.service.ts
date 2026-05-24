import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PaymentEvent, PaymentOutcome } from './entities/payment-event.entity';
import { PaymentTransaction } from './entities/payment-transaction.entity';
import { Booking, PaymentStatus } from '../booking/entities/booking.entity';
import { CreatePaymentIntentDto, PaymentWebhookDto, WebhookProvider } from './dto/payment.dto';
import { AuditLog } from '../auth/entities/audit-log.entity';

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

    const tx = this.txRepo.create({
      bookingId: dto.bookingId,
      amount: dto.amount,
      currency: 'VND',
      providerRef: `mock_intent_${Date.now()}`,
      status: PaymentStatus.PENDING,
    });
    
    await this.txRepo.save(tx);

    return {
      clientSecret: 'mock_client_secret',
      transactionId: tx.id,
    };
  }

  async getPayments(bookingId?: string): Promise<PaymentTransaction[]> {
    const where: any = {};
    if (bookingId) where.bookingId = bookingId;
    return this.txRepo.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async refundPayment(id: string, actorId: string) {
    const tx = await this.txRepo.findOne({ where: { id } });
    if (!tx) throw new NotFoundException('Transaction not found');
    if (tx.status !== PaymentStatus.PAID) {
      throw new BadRequestException('Can only refund PAID transactions');
    }

    const booking = await this.bookingRepo.findOne({ where: { id: tx.bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');

    const beforeStatus = tx.status;
    tx.status = PaymentStatus.REFUNDED;
    await this.txRepo.save(tx);

    booking.paymentStatus = PaymentStatus.REFUNDED;
    await this.bookingRepo.save(booking);

    // Save audit log
    await this.dataSource.getRepository(AuditLog).save(
      this.dataSource.getRepository(AuditLog).create({
        actorId,
        action: 'payment.refund',
        entityType: 'payment_transactions',
        entityId: id,
        before: { status: beforeStatus },
        after: { status: PaymentStatus.REFUNDED },
      })
    );

    return {
      success: true,
      transaction: tx,
    };
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    const secret = this.config.get<string>('payment.webhookSecret');
    if (!secret) return false;

    const expectedSig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    return expectedSig === signature;
  }

  async handleWebhook(dto: PaymentWebhookDto, rawPayload: string) {
    const payloadHash = crypto.createHash('sha256').update(rawPayload).digest('hex');
    const existingEvent = await this.eventRepo.findOne({ where: { eventId: dto.eventId } });
    
    if (existingEvent) {
      this.logger.log(`Webhook event ${dto.eventId} already processed.`);
      return { success: true, duplicate: true };
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const outcome = dto.status === 'SUCCESS' ? PaymentOutcome.SUCCESS : PaymentOutcome.FAILED;
      const event = queryRunner.manager.create(PaymentEvent, {
        eventId: dto.eventId,
        provider: dto.provider,
        payloadHash,
        outcome,
      });
      await queryRunner.manager.save(event);

      const booking = await queryRunner.manager.findOne(Booking, { where: { id: dto.bookingId } });
      if (booking) {
        if (outcome === PaymentOutcome.SUCCESS) {
          booking.paymentStatus = PaymentStatus.PAID;
          
          // Also update transaction status to PAID
          await queryRunner.manager.update(
            PaymentTransaction,
            { bookingId: dto.bookingId, status: PaymentStatus.PENDING },
            { status: PaymentStatus.PAID, eventId: dto.eventId }
          );
        } else {
          booking.paymentStatus = PaymentStatus.FAILED;
          
          await queryRunner.manager.update(
            PaymentTransaction,
            { bookingId: dto.bookingId, status: PaymentStatus.PENDING },
            { status: PaymentStatus.FAILED, eventId: dto.eventId }
          );
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
