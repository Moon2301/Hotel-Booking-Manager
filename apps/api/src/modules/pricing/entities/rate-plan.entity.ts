import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Unique,
} from 'typeorm';
import { Property } from '../../property/entities/property.entity';

@Entity('rate_plans')
@Unique(['propertyId', 'code'])
export class RatePlan {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'property_id' }) propertyId: string;
  @ManyToOne(() => Property, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'property_id' })
  property: Property;
  @Column() code: string;
  @Column({ nullable: true }) name: string;
  @Column({ type: 'char', length: 3, default: 'VND' }) currency: string;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}
