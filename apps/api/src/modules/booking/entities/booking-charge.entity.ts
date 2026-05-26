import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Booking } from './booking.entity';
import { Room } from '../../property/entities/room.entity';
import { ServiceItem } from './service-item.entity';
import { User } from '../../auth/entities/user.entity';

export enum BookingChargeStatus {
  POSTED = 'POSTED',
  VOID = 'VOID',
}

@Entity('booking_charges')
export class BookingCharge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'booking_id' })
  bookingId: string;

  @ManyToOne(() => Booking, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @Column({ name: 'room_id', nullable: true })
  roomId: string;

  @ManyToOne(() => Room, { nullable: true })
  @JoinColumn({ name: 'room_id' })
  room: Room;

  @Column({ name: 'service_item_id', nullable: true })
  serviceItemId: string;

  @ManyToOne(() => ServiceItem, { nullable: true })
  @JoinColumn({ name: 'service_item_id' })
  serviceItem: ServiceItem;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, name: 'unit_price' })
  unitPrice: number;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'char', length: 3, default: 'VND' })
  currency: string;

  @Column({
    type: 'enum',
    enum: BookingChargeStatus,
    default: BookingChargeStatus.POSTED,
  })
  status: BookingChargeStatus;

  @Column({ name: 'created_by', nullable: true })
  createdBy: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

