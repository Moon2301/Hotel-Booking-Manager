import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, OneToMany, JoinColumn, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { Property } from '../../property/entities/property.entity';
import { Room } from '../../property/entities/room.entity';
import { RoomType } from '../../property/entities/room-type.entity';
import { Guest } from '../../guest/entities/guest.entity';
import { Invoice } from './invoice.entity';
import { Task } from '../../task/entities/task.entity';

export enum BookingStatus {
  HOLD = 'HOLD',
  CONFIRMED = 'CONFIRMED',
  CHECKED_IN = 'CHECKED_IN',
  CHECKED_OUT = 'CHECKED_OUT',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

import { PaymentStatus } from './invoice.entity';
export { PaymentStatus };

@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn('uuid') id: string;
  
  @Column({ name: 'property_id' }) propertyId: string;
  @ManyToOne(() => Property)
  @JoinColumn({ name: 'property_id' })
  property: Property;

  @Column({ name: 'room_id', nullable: true }) roomId: string;
  @ManyToOne(() => Room)
  @JoinColumn({ name: 'room_id' })
  room: Room;

  @Column({ name: 'room_type_id' }) roomTypeId: string;
  @ManyToOne(() => RoomType)
  @JoinColumn({ name: 'room_type_id' })
  roomType: RoomType;

  @Column({ name: 'guest_id' }) guestId: string;
  @ManyToOne(() => Guest)
  @JoinColumn({ name: 'guest_id' })
  guest: Guest;

  @OneToMany(() => Invoice, (invoice) => invoice.booking)
  invoices: Invoice[];

  @OneToMany(() => Task, (task) => task.booking)
  tasks: Task[];

  @Column({ type: 'enum', enum: BookingStatus, default: BookingStatus.HOLD }) status: BookingStatus;
  
  @Column({ type: 'date', name: 'check_in' }) checkIn: string;
  @Column({ type: 'date', name: 'check_out' }) checkOut: string;
  
  @Column({ type: 'jsonb', name: 'policy_snapshot', nullable: true }) policySnapshot: Record<string, any>;
  
  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING, name: 'payment_status' }) paymentStatus: PaymentStatus;
  
  @Column({ type: 'numeric', precision: 12, scale: 2, name: 'total_amount', nullable: true }) totalAmount: number;
  @Column({ type: 'char', length: 3, default: 'VND' }) currency: string;
  
  @Column({ nullable: true }) notes: string;

  // ─── Digital Check-in (QR / PIN) ──────────────────────────────────────────
  @Column({ name: 'checkin_token', nullable: true, unique: true })
  checkinToken: string;

  @Column({ name: 'checkin_pin', nullable: true, length: 60 })
  checkinPin: string; // bcrypt hash of 6-digit PIN

  @Column({ name: 'checkin_token_expires_at', type: 'timestamptz', nullable: true })
  checkinTokenExpiresAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}
