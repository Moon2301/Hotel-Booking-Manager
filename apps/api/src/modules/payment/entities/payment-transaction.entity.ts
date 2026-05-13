import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { Booking, PaymentStatus } from '../../booking/entities/booking.entity';
import { PaymentEvent } from './payment-event.entity';

@Entity('payment_transactions')
export class PaymentTransaction {
  @PrimaryGeneratedColumn('uuid') id: string;
  
  @Column({ name: 'booking_id' }) bookingId: string;
  @ManyToOne(() => Booking)
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @Column({ name: 'provider_ref', nullable: true }) providerRef: string;
  @Column({ type: 'numeric', precision: 12, scale: 2 }) amount: number;
  @Column({ type: 'char', length: 3, default: 'VND' }) currency: string;
  
  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING }) status: PaymentStatus;
  
  @Column({ name: 'event_id', nullable: true }) eventId: string;
  @ManyToOne(() => PaymentEvent)
  @JoinColumn({ name: 'event_id', referencedColumnName: 'eventId' })
  event: PaymentEvent;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}
