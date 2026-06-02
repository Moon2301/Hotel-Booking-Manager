import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { ReferralPartner } from './entities/referral-partner.entity';
import {
  PartnerCommission,
  PartnerCommissionStatus,
} from './entities/partner-commission.entity';
import {
  CreateReferralPartnerDto,
  UpdateReferralPartnerDto,
} from './dto/partner.dto';
import { PartnerCommissionService } from './partner-commission.service';

export type PartnerSummary = {
  partner: ReferralPartner;
  referralUrl: string;
  stats: {
    totalBookings: number;
    paidBookings: number;
    accruedCommission: number;
    paidOutCommission: number;
  };
};

@Injectable()
export class PartnerService {
  constructor(
    @InjectRepository(ReferralPartner)
    private readonly partnerRepo: Repository<ReferralPartner>,
    @InjectRepository(PartnerCommission)
    private readonly commissionRepo: Repository<PartnerCommission>,
    private readonly commissionService: PartnerCommissionService,
    private readonly config: ConfigService,
  ) {}

  private guestSiteBase(): string {
    return (this.config.get<string>('vnpay.clientUrl') || 'http://localhost:8080')
      .replace(/\/$/, '');
  }

  buildReferralUrl(code: string): string {
    const base = this.guestSiteBase();
    return `${base}/?ref=${encodeURIComponent(code)}`;
  }

  async list(): Promise<PartnerSummary[]> {
    const partners = await this.partnerRepo.find({
      order: { createdAt: 'DESC' },
    });
    return Promise.all(partners.map((p) => this.toSummary(p)));
  }

  async get(id: string): Promise<PartnerSummary> {
    const partner = await this.partnerRepo.findOne({ where: { id } });
    if (!partner) throw new NotFoundException('Partner not found');
    return this.toSummary(partner);
  }

  async create(dto: CreateReferralPartnerDto): Promise<PartnerSummary> {
    const code = this.commissionService.normalizeCode(dto.code);
    const exists = await this.partnerRepo.findOne({ where: { code } });
    if (exists) {
      throw new ConflictException(`Partner code "${code}" already exists`);
    }

    const partner = await this.partnerRepo.save(
      this.partnerRepo.create({
        name: dto.name.trim(),
        code,
        commissionRatePercent: dto.commissionRatePercent ?? 5,
        contactEmail: dto.contactEmail?.trim() || null,
        contactPhone: dto.contactPhone?.trim() || null,
        notes: dto.notes?.trim() || null,
        isActive: true,
      }),
    );
    return this.toSummary(partner);
  }

  async update(
    id: string,
    dto: UpdateReferralPartnerDto,
  ): Promise<PartnerSummary> {
    const partner = await this.partnerRepo.findOne({ where: { id } });
    if (!partner) throw new NotFoundException('Partner not found');

    if (dto.name !== undefined) partner.name = dto.name.trim();
    if (dto.commissionRatePercent !== undefined) {
      partner.commissionRatePercent = dto.commissionRatePercent;
    }
    if (dto.contactEmail !== undefined) {
      partner.contactEmail = dto.contactEmail?.trim() || null;
    }
    if (dto.contactPhone !== undefined) {
      partner.contactPhone = dto.contactPhone?.trim() || null;
    }
    if (dto.notes !== undefined) partner.notes = dto.notes?.trim() || null;
    if (dto.isActive !== undefined) partner.isActive = dto.isActive;

    await this.partnerRepo.save(partner);
    return this.toSummary(partner);
  }

  async listCommissions(partnerId?: string) {
    const where = partnerId ? { partnerId } : {};
    return this.commissionRepo.find({
      where,
      relations: ['partner', 'booking', 'booking.guest'],
      order: { createdAt: 'DESC' },
      take: 200,
    });
  }

  async markCommissionPaidOut(commissionId: string) {
    const row = await this.commissionRepo.findOne({
      where: { id: commissionId },
    });
    if (!row) throw new NotFoundException('Commission not found');
    if (row.status === PartnerCommissionStatus.CANCELLED) {
      throw new BadRequestException('Commission is cancelled');
    }
    if (row.status === PartnerCommissionStatus.PAID_OUT) {
      return row;
    }
    row.status = PartnerCommissionStatus.PAID_OUT;
    row.paidOutAt = new Date();
    return this.commissionRepo.save(row);
  }

  private async toSummary(partner: ReferralPartner): Promise<PartnerSummary> {
    const commissions = await this.commissionRepo.find({
      where: { partnerId: partner.id },
    });

    let accruedCommission = 0;
    let paidOutCommission = 0;
    let paidBookings = 0;

    for (const c of commissions) {
      if (c.status === PartnerCommissionStatus.CANCELLED) continue;
      paidBookings += 1;
      const amt = Number(c.commissionAmount);
      if (c.status === PartnerCommissionStatus.PAID_OUT) {
        paidOutCommission += amt;
      } else if (c.status === PartnerCommissionStatus.ACCRUED) {
        accruedCommission += amt;
      }
    }

    return {
      partner,
      referralUrl: this.buildReferralUrl(partner.code),
      stats: {
        totalBookings: commissions.filter(
          (c) => c.status !== PartnerCommissionStatus.CANCELLED,
        ).length,
        paidBookings,
        accruedCommission,
        paidOutCommission,
      },
    };
  }
}
