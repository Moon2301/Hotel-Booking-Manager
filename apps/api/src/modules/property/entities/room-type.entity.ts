import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { Property } from './property.entity';

@Entity('room_types')
export class RoomType {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'property_id' }) propertyId: string;
  @ManyToOne(() => Property, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'property_id' })
  property: Property;
  @Column() name: string;
  @Column({ type: 'numeric', precision: 12, scale: 2, name: 'base_price', default: 0 }) basePrice: number;
  @Column({ name: 'max_occupancy', default: 2 }) maxOccupancy: number;
  @Column({ type: 'jsonb', default: [] }) amenities: string[];
  @Column({ type: 'jsonb', nullable: true, default: [] }) images: string[];
  @Column({ nullable: true }) description: string;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}
