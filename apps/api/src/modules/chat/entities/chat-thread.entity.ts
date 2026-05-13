import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { Property } from '../../property/entities/property.entity';
import { Booking } from '../../booking/entities/booking.entity';
import { User } from '../../auth/entities/user.entity';

export enum ChatThreadStatus {
  OPEN = 'OPEN',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

@Entity('chat_threads')
export class ChatThread {
  @PrimaryGeneratedColumn('uuid') id: string;
  
  @Column({ name: 'property_id' }) propertyId: string;
  @ManyToOne(() => Property)
  @JoinColumn({ name: 'property_id' })
  property: Property;

  @Column({ name: 'booking_id', nullable: true }) bookingId: string;
  @ManyToOne(() => Booking)
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @Column({ name: 'guest_id' }) guestId: string;
  @ManyToOne(() => User)
  @JoinColumn({ name: 'guest_id' })
  guest: User;

  @Column({ type: 'enum', enum: ChatThreadStatus, default: ChatThreadStatus.OPEN }) status: ChatThreadStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}
