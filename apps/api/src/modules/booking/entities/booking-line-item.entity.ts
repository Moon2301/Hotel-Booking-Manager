import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Booking } from './booking.entity';

@Entity('booking_line_items')
export class BookingLineItem {
  @PrimaryGeneratedColumn('uuid') id: string;
  
  @Column({ name: 'booking_id' }) bookingId: string;
  @ManyToOne(() => Booking, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @Column({ type: 'date' }) night: string;
  @Column({ type: 'numeric', precision: 12, scale: 2, name: 'unit_price' }) unitPrice: number;
  
  @Column({ type: 'jsonb', name: 'tax_breakdown', nullable: true }) taxBreakdown: Record<string, any>;
  
  @Column({ name: 'rate_plan_code', nullable: true }) ratePlanCode: string;
  @Column({ type: 'char', length: 3, default: 'VND' }) currency: string;
  
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
}
