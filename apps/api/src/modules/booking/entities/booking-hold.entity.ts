import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Property } from '../../property/entities/property.entity';
import { RoomType } from '../../property/entities/room-type.entity';
import { Booking } from './booking.entity';

@Entity('booking_holds')
export class BookingHold {
  @PrimaryGeneratedColumn('uuid') id: string;
  
  @Column({ name: 'booking_id', nullable: true }) bookingId: string;
  @ManyToOne(() => Booking, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @Column({ name: 'room_type_id' }) roomTypeId: string;
  @ManyToOne(() => RoomType)
  @JoinColumn({ name: 'room_type_id' })
  roomType: RoomType;

  @Column({ name: 'property_id' }) propertyId: string;
  @ManyToOne(() => Property)
  @JoinColumn({ name: 'property_id' })
  property: Property;

  @Column({ type: 'date', array: true }) nights: string[];
  
  @Column({ name: 'expires_at', type: 'timestamptz' }) expiresAt: Date;
  @Column({ name: 'released_at', type: 'timestamptz', nullable: true }) releasedAt: Date;
  
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
}
