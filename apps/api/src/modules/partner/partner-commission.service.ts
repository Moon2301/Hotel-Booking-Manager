import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PartnerCommission,
  PartnerCommissionStatus,
} from './entities/partner-commission.entity';
import { ReferralPartner } from './entities/referral-partner.entity';
import { Booking } from '../booking/entities/booking.entity';
import { PaymentStatus } from '../booking/entities/invoice.entity';

@Injectable()
export class PartnerCommissionService {
  private readonly logger = new Logger(PartnerCommissionService.name);

  constructor(
    @InjectRepository(PartnerCommission)
    private readonly commissionRepo: Repository<PartnerCommission>,
    @InjectRepository(ReferralPartner)
    private readonly partnerRepo: Repository<ReferralPartner>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
  ) {}

  normalizeCode(raw: string): string {
    return raw.trim().toLowerCase();
  }

  async resolveActivePartnerId(partnerRef?: string): Promise<string | null> {
    if (!partnerRef?.trim()) return null;
    const code = this.normalizeCode(partnerRef);
    const partner = await this.partnerRepo.findOne({
      where: { code, isActive: true },
    });
    return partner?.id ?? null;
  }

  async resolvePublicPartner(partnerRef: string) {
    const code = this.normalizeCode(partnerRef);
    const partner = await this.partnerRepo.findOne({
      where: { code, isActive: true },
    });
    if (!partner) return { valid: false as const };
    return {
      valid: true as const,
      name: partner.name,
      code: partner.code,
    };
  }

  /**
   * Tạo bản ghi hoa hồng khi booking đã thanh toán (idempotent).
   */
  async accrueForPaidBooking(bookingId: string): Promise<void> {
    const existing = await this.commissionRepo.findOne({
      where: { bookingId },
    });
    if (existing) {
      if (existing.status === PartnerCommissionStatus.CANCELLED) {
        this.logger.warn(
          `Commission for booking ${bookingId} was cancelled; not re-accruing`,
        );
      }
      return;
    }

    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId },
      relations: ['partner'],
    });
    if (!booking?.partnerId) return;
    if (booking.paymentStatus !== PaymentStatus.PAID) return;

    const partner =
      booking.partner ??
      (await this.partnerRepo.findOne({ where: { id: booking.partnerId } }));
    if (!partner?.isActive) return;

    const bookingAmount = Number(booking.totalAmount ?? 0);
    if (bookingAmount <= 0) return;

    const rate = Number(partner.commissionRatePercent);
    const commissionAmount = Math.round((bookingAmount * rate) / 100);

    await this.commissionRepo.save(
      this.commissionRepo.create({
        partnerId: partner.id,
        bookingId: booking.id,
        bookingAmount,
        commissionRatePercent: rate,
        commissionAmount,
        status: PartnerCommissionStatus.ACCRUED,
      }),
    );
  }

  async cancelForBooking(bookingId: string): Promise<void> {
    const row = await this.commissionRepo.findOne({ where: { bookingId } });
    if (!row) return;
    if (row.status === PartnerCommissionStatus.PAID_OUT) {
      this.logger.warn(
        `Commission ${row.id} already paid out; manual adjustment may be needed`,
      );
      return;
    }
    row.status = PartnerCommissionStatus.CANCELLED;
    await this.commissionRepo.save(row);
  }
}
