import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Property } from '../../property/entities/property.entity';

@Entity('cancellation_policies')
export class CancellationPolicy {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'property_id' }) propertyId: string;
  @ManyToOne(() => Property, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'property_id' })
  property: Property;
  @Column({ name: 'free_cancel_until_hours_before_checkin', default: 24 }) freeCancelUntilHoursBeforeCheckin: number;
  @Column({ type: 'jsonb', name: 'fee_rule_ref', nullable: true }) feeRuleRef: Record<string, any>;
  @Column({ type: 'jsonb', name: 'no_show_rule', nullable: true }) noShowRule: Record<string, any>;
  @Column({ name: 'policy_version', default: 1 }) policyVersion: number;
  @Column({ name: 'is_active', default: true }) isActive: boolean;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
}
