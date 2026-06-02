import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { PartnerCommission } from './partner-commission.entity';

@Entity('referral_partners')
export class ReferralPartner {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({ type: 'varchar', length: 120 }) name: string;

  /** Mã trong URL ?ref=CODE (chữ thường, số, gạch ngang) */
  @Column({ type: 'varchar', length: 32, unique: true }) code: string;

  @Column({
    name: 'commission_rate_percent',
    type: 'numeric',
    precision: 5,
    scale: 2,
    default: 5,
  })
  commissionRatePercent: number;

  @Column({ name: 'contact_email', type: 'varchar', length: 255, nullable: true })
  contactEmail: string | null;

  @Column({ name: 'contact_phone', type: 'varchar', length: 32, nullable: true })
  contactPhone: string | null;

  @Column({ type: 'text', nullable: true }) notes: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true }) isActive: boolean;

  @OneToMany(() => PartnerCommission, (c) => c.partner)
  commissions: PartnerCommission[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
