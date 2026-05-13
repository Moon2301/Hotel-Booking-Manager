import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum PaymentOutcome {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  DISPUTED = 'DISPUTED',
}

@Entity('payment_events')
export class PaymentEvent {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'event_id', unique: true }) eventId: string;
  @Column() provider: string;
  @Column({ name: 'payload_hash' }) payloadHash: string;
  @Column({ type: 'enum', enum: PaymentOutcome }) outcome: PaymentOutcome;
  @CreateDateColumn({ name: 'processed_at', type: 'timestamptz' }) processedAt: Date;
}
