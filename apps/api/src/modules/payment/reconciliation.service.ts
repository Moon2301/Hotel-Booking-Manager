import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Invoice } from '../booking/entities/invoice.entity';
import { ReconciliationTicket, ReconciliationStatus } from '../booking/entities/reconciliation-ticket.entity';

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(
    @InjectRepository(Invoice) private invoiceRepo: Repository<Invoice>,
    @InjectRepository(ReconciliationTicket) private ticketRepo: Repository<ReconciliationTicket>,
  ) {}

  /**
   * Daily Reconciliation Job
   * Runs every day at 02:00 AM to reconcile the previous day's transactions
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleDailyReconciliation() {
    this.logger.log('Starting daily reconciliation job...');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    try {
      await this.runReconciliationForDate(dateStr);
      this.logger.log(`Completed reconciliation for ${dateStr}`);
    } catch (error) {
      this.logger.error(`Failed reconciliation for ${dateStr}:`, error);
    }
  }

  /**
   * Reconciles invoices against simulated gateway report
   * In a real system, this would fetch a CSV/API report from VNPay
   */
  async runReconciliationForDate(dateString: string) {
    const startOfDay = new Date(`${dateString}T00:00:00.000Z`);
    const endOfDay = new Date(`${dateString}T23:59:59.999Z`);

    // Fetch invoices that were PAID on this date
    const invoices = await this.invoiceRepo.find({
      where: {
        paidAt: Between(startOfDay, endOfDay),
        paymentMethod: 'VNPAY' as any, // assuming 'VNPAY' exists in enum
      },
      relations: ['booking'],
    });

    // TODO: Replace with actual VNPay Settlement API call before going to production.
    // Example: const gatewayReport = await this.vnpayService.getSettlementReport(dateString);
    // The settlement report is typically a CSV/JSON from VNPay's portal API.
    // Without a real gateway report, all VNPAY invoices are flagged as UNRESOLVED.
    const gatewayReport: { vnpayTransactionId: string | null; amount: number }[] = [];

    for (const invoice of invoices) {
      const gatewayRecord = gatewayReport.find(r => r.vnpayTransactionId === invoice.vnpayTransactionId);
      
      let status = ReconciliationStatus.MATCHED;
      let notes = '';

      if (!gatewayRecord) {
        status = ReconciliationStatus.UNRESOLVED;
        notes = 'Missing in gateway report — awaiting VNPay Settlement API integration';
      } else if (Number(gatewayRecord.amount) !== Number(invoice.totalAmount)) {
        status = ReconciliationStatus.DISCREPANCY;
        notes = `Amount mismatch. System: ${invoice.totalAmount}, Gateway: ${gatewayRecord.amount}`;
      }

      // Record ticket if not matched
      if (status !== ReconciliationStatus.MATCHED) {
        const ticket = this.ticketRepo.create({
          invoiceId: invoice.id,
          transactionDate: dateString,
          systemAmount: invoice.totalAmount,
          gatewayAmount: gatewayRecord?.amount || null,
          status,
          notes,
        });
        await this.ticketRepo.save(ticket);
        this.logger.warn(`Discrepancy found for invoice ${invoice.id}: ${notes}`);
      }
    }
    
    return { reconciled: invoices.length };
  }

  async getTickets(propertyId?: string) {
    const qb = this.ticketRepo.createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.invoice', 'invoice')
      .leftJoinAndSelect('invoice.booking', 'booking')
      .orderBy('ticket.createdAt', 'DESC');

    if (propertyId) {
      qb.where('booking.propertyId = :propertyId', { propertyId });
    }

    return qb.getMany();
  }
}
