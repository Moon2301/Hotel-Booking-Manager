import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Unique,
} from 'typeorm';
import { Property } from '../../property/entities/property.entity';
import { RoomType } from '../../property/entities/room-type.entity';
import { RatePlan } from './rate-plan.entity';

export enum RateSource {
  MANUAL = 'MANUAL',
  RULE = 'RULE',
  IMPORT = 'IMPORT',
}

@Entity('daily_rate')
@Unique(['propertyId', 'roomTypeId', 'night', 'ratePlanId'])
export class DailyRate {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'property_id' }) propertyId: string;
  @ManyToOne(() => Property, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'property_id' })
  property: Property;
  @Column({ name: 'room_type_id' }) roomTypeId: string;
  @ManyToOne(() => RoomType, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'room_type_id' })
  roomType: RoomType;
  @Column({ name: 'rate_plan_id', nullable: true }) ratePlanId: string;
  @ManyToOne(() => RatePlan)
  @JoinColumn({ name: 'rate_plan_id' })
  ratePlan: RatePlan;
  @Column({ type: 'date' }) night: string;
  @Column({ type: 'numeric', precision: 12, scale: 2 }) amount: number;
  @Column({ type: 'char', length: 3, default: 'VND' }) currency: string;
  @Column({ name: 'tax_included', default: true }) taxIncluded: boolean;
  @Column({ name: 'min_stay', default: 1 }) minStay: number;
  @Column({ name: 'closed_to_arrival', default: false }) closedToArrival: boolean;
  @Column({ type: 'enum', enum: RateSource, default: RateSource.MANUAL }) rateSource: RateSource;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}
