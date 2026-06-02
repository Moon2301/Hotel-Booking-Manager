import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ReferralPartner } from './referral-partner.entity';
import { Booking } from '../../booking/entities/booking.entity';

export enum PartnerCommissionStatus {
  ACCRUED = 'ACCRUED',
  PAID_OUT = 'PAID_OUT',
  CANCELLED = 'CANCELLED',
}

@Entity('partner_commissions')
export class PartnerCommission {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({ name: 'partner_id' }) partnerId: string;
  @ManyToOne(() => ReferralPartner, (p) => p.commissions)
  @JoinColumn({ name: 'partner_id' })
  partner: ReferralPartner;

  @Column({ name: 'booking_id' }) bookingId: string;
  @ManyToOne(() => Booking)
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @Column({ name: 'booking_amount', type: 'numeric', precision: 12, scale: 2 })
  bookingAmount: number;

  @Column({
    name: 'commission_rate_percent',
    type: 'numeric',
    precision: 5,
    scale: 2,
  })
  commissionRatePercent: number;

  @Column({ name: 'commission_amount', type: 'numeric', precision: 12, scale: 2 })
  commissionAmount: number;

  @Column({
    type: 'enum',
    enum: PartnerCommissionStatus,
    default: PartnerCommissionStatus.ACCRUED,
  })
  status: PartnerCommissionStatus;

  @Column({ name: 'paid_out_at', type: 'timestamptz', nullable: true })
  paidOutAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
