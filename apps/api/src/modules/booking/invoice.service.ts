import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice, PaymentMethod } from './entities/invoice.entity';
import { Booking, PaymentStatus } from './entities/booking.entity';
import { AuditLog } from '../auth/entities/audit-log.entity';

@Injectable()
export class InvoiceService {
  constructor(
    @InjectRepository(Invoice) private invoiceRepo: Repository<Invoice>,
    @InjectRepository(Booking) private bookingRepo: Repository<Booking>,
    @InjectRepository(AuditLog) private auditRepo: Repository<AuditLog>,
  ) {}

  async createInvoice(bookingId: string, totalAmount: number): Promise<Invoice> {
    const invoice = this.invoiceRepo.create({
      bookingId,
      totalAmount,
      paymentStatus: PaymentStatus.PENDING,
    });
    return this.invoiceRepo.save(invoice);
  }

  async listInvoices() {
    return this.invoiceRepo.find({
      relations: ['booking'],
      order: { issuedAt: 'DESC' },
    });
  }

  async getInvoice(id: string): Promise<Invoice> {
    const invoice = await this.invoiceRepo.findOne({
      where: { id },
      relations: ['booking'],
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async getInvoiceByBooking(bookingId: string): Promise<Invoice | null> {
    return this.invoiceRepo.findOne({
      where: { bookingId },
      relations: ['booking'],
    });
  }

  /**
   * Manual payment confirmation by Admin/Front Desk (cash or card at counter)
   */
  async confirmManualPayment(
    invoiceId: string,
    method: 'CASH' | 'CARD',
    actorId: string,
  ): Promise<Invoice> {
    const invoice = await this.getInvoice(invoiceId);

    if (invoice.paymentStatus === PaymentStatus.PAID) {
      throw new BadRequestException('Invoice is already paid');
    }

    const before = {
      paymentStatus: invoice.paymentStatus,
      paymentMethod: invoice.paymentMethod,
    };

    invoice.paymentStatus = PaymentStatus.PAID;
    invoice.paymentMethod = method === 'CASH' ? PaymentMethod.CASH : PaymentMethod.CARD;
    invoice.paidAt = new Date();

    const saved = await this.invoiceRepo.save(invoice);

    // Also update booking payment status
    const booking = await this.bookingRepo.findOne({ where: { id: invoice.bookingId } });
    if (booking) {
      booking.paymentStatus = PaymentStatus.PAID;
      await this.bookingRepo.save(booking);
    }

    // Audit log
    await this.auditRepo.save(
      this.auditRepo.create({
        actorId,
        action: 'invoice.manual_payment',
        entityType: 'invoices',
        entityId: invoiceId,
        before: before as any,
        after: { paymentStatus: saved.paymentStatus, paymentMethod: saved.paymentMethod },
      }),
    );

    return saved;
  }

  /**
   * VNPay payment confirmation (called from VNPay callback)
   */
  async confirmVnpayPayment(
    invoiceId: string,
    vnpayTransactionId: string,
  ): Promise<Invoice> {
    const invoice = await this.getInvoice(invoiceId);

    if (invoice.paymentStatus === PaymentStatus.PAID) {
      return invoice; // Already paid, idempotent
    }

    invoice.paymentStatus = PaymentStatus.PAID;
    invoice.paymentMethod = PaymentMethod.VNPAY;
    invoice.vnpayTransactionId = vnpayTransactionId;
    invoice.paidAt = new Date();

    const saved = await this.invoiceRepo.save(invoice);

    // Also update booking payment status
    const booking = await this.bookingRepo.findOne({ where: { id: invoice.bookingId } });
    if (booking) {
      booking.paymentStatus = PaymentStatus.PAID;
      await this.bookingRepo.save(booking);
    }

    return saved;
  }
}
