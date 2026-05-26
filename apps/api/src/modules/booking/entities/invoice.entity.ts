import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Booking } from './booking.entity';

export enum PaymentStatus {
  PENDING = 'PENDING',
  AUTHORISED = 'AUTHORISED',
  PAID = 'PAID',
  REFUNDED = 'REFUNDED',
  FAILED = 'FAILED',
}

export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  VNPAY = 'VNPAY',
}

export enum InvoiceType {
  DEPOSIT = 'DEPOSIT',
  FINAL = 'FINAL',
}

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({ name: 'booking_id' }) bookingId: string;
  @ManyToOne(() => Booking)
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @Column({ type: 'numeric', precision: 12, scale: 2, name: 'total_amount' })
  totalAmount: number;

  @Column({
    type: 'enum',
    enum: InvoiceType,
    name: 'invoice_type',
    default: InvoiceType.DEPOSIT,
  })
  invoiceType: InvoiceType;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING, name: 'payment_status' })
  paymentStatus: PaymentStatus;

  @Column({ type: 'enum', enum: PaymentMethod, nullable: true, name: 'payment_method' })
  paymentMethod: PaymentMethod;

  @Column({ name: 'vnpay_transaction_id', nullable: true })
  vnpayTransactionId: string;

  @CreateDateColumn({ name: 'issued_at', type: 'timestamptz' })
  issuedAt: Date;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
