import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { Booking } from '../../booking/entities/booking.entity';
import { User } from '../../auth/entities/user.entity';
import { Guest } from '../../guest/entities/guest.entity';
import { Property } from '../../property/entities/property.entity';

export enum ReviewStatus {
  PUBLISHED = 'PUBLISHED',
  HIDDEN = 'HIDDEN',
  FLAGGED = 'FLAGGED',
}

@Entity('reviews')
export class Review {
  @PrimaryGeneratedColumn('uuid') id: string;
  
  @Column({ name: 'booking_id' }) bookingId: string;
  @ManyToOne(() => Booking)
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @Column({ name: 'guest_id' }) guestId: string;
  @ManyToOne(() => Guest)
  @JoinColumn({ name: 'guest_id' })
  guest: Guest;

  @Column({ name: 'property_id' }) propertyId: string;
  @ManyToOne(() => Property)
  @JoinColumn({ name: 'property_id' })
  property: Property;

  @Column({ type: 'smallint' }) rating: number;
  @Column({ type: 'text', nullable: true }) content: string;
  
  @Column({ name: 'content_hash', nullable: true }) contentHash: string;
  @Column({ name: 'device_fingerprint', nullable: true }) deviceFingerprint: string;

  @Column({ type: 'enum', enum: ReviewStatus, default: ReviewStatus.PUBLISHED }) status: ReviewStatus;
  
  @Column({ name: 'flagged_reason', nullable: true }) flaggedReason: string;
  @Column({ name: 'hidden_reason', nullable: true }) hiddenReason: string;

  @Column({ name: 'moderated_by', nullable: true }) moderatedBy: string;
  @ManyToOne(() => User)
  @JoinColumn({ name: 'moderated_by' })
  moderator: User;

  @Column({ name: 'moderated_at', type: 'timestamptz', nullable: true }) moderatedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}
