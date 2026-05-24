import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Invoice } from './invoice.entity';

export enum ReconciliationStatus {
  MATCHED = 'MATCHED',
  DISCREPANCY = 'DISCREPANCY',
  UNRESOLVED = 'UNRESOLVED',
  RESOLVED = 'RESOLVED',
}

@Entity('reconciliation_tickets')
export class ReconciliationTicket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'invoice_id' })
  invoiceId: string;

  @ManyToOne(() => Invoice)
  @JoinColumn({ name: 'invoice_id' })
  invoice: Invoice;

  @Column({ type: 'date', name: 'transaction_date' })
  transactionDate: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, name: 'system_amount' })
  systemAmount: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, name: 'gateway_amount', nullable: true })
  gatewayAmount: number | null;

  @Column({ type: 'enum', enum: ReconciliationStatus, default: ReconciliationStatus.UNRESOLVED })
  status: ReconciliationStatus;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
