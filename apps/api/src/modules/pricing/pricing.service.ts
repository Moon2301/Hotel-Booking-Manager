import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, IsNull } from 'typeorm';
import { DailyRate, RateSource } from './entities/daily-rate.entity';
import { RatePlan } from './entities/rate-plan.entity';
import { BulkUpdateRatesDto, CreateRatePlanDto, UpdateRatePlanDto } from './dto/pricing.dto';
import { AuditLog } from '../auth/entities/audit-log.entity';

@Injectable()
export class PricingService {
  constructor(
    @InjectRepository(DailyRate) private dailyRateRepo: Repository<DailyRate>,
    @InjectRepository(RatePlan) private ratePlanRepo: Repository<RatePlan>,
    @InjectRepository(AuditLog) private auditRepo: Repository<AuditLog>,
  ) {}

  // ─── Daily Rates ──────────────────────────────────────────────────────────

  async getRates(propertyId: string, from: string, to: string): Promise<DailyRate[]> {
    return this.dailyRateRepo.find({
      where: {
        propertyId,
        night: Between(from, to),
      },
      order: { night: 'ASC' },
    });
  }

  async bulkUpdateRates(propertyId: string, dto: BulkUpdateRatesDto, actorId: string) {
    const saved: DailyRate[] = [];

    for (const rate of dto.rates) {
      const ratePlanId = rate.ratePlanId ?? null;
      const existing = await this.dailyRateRepo.findOne({
        where: {
          propertyId,
          roomTypeId: rate.roomTypeId,
          night: rate.night,
          ratePlanId: ratePlanId === null ? IsNull() : ratePlanId,
        },
      });

      if (existing) {
        existing.amount = rate.amount;
        existing.taxIncluded = rate.taxIncluded ?? existing.taxIncluded;
        existing.minStay = rate.minStay ?? existing.minStay;
        existing.closedToArrival =
          rate.closedToArrival ?? existing.closedToArrival;
        existing.rateSource = RateSource.MANUAL;
        saved.push(await this.dailyRateRepo.save(existing));
      } else {
        const created = this.dailyRateRepo.create({
          propertyId,
          roomTypeId: rate.roomTypeId,
          night: rate.night,
          ratePlanId: ratePlanId ?? undefined,
          amount: rate.amount,
          taxIncluded: rate.taxIncluded ?? true,
          minStay: rate.minStay ?? 1,
          closedToArrival: rate.closedToArrival ?? false,
          rateSource: RateSource.MANUAL,
        });
        saved.push(await this.dailyRateRepo.save(created));
      }
    }

    await this.auditRepo.save({
      actorId,
      action: 'pricing.bulk_update',
      entityType: 'daily_rate',
      entityId: propertyId,
      after: { updatedCount: saved.length },
    });

    return saved;
  }

  // ─── Rate Plans ───────────────────────────────────────────────────────────

  async createRatePlan(propertyId: string, dto: CreateRatePlanDto, actorId: string): Promise<RatePlan> {
    const existing = await this.ratePlanRepo.findOne({
      where: { propertyId, code: dto.code },
    });
    if (existing) {
      throw new ConflictException(`Rate plan with code ${dto.code} already exists for this property`);
    }

    const ratePlan = this.ratePlanRepo.create({
      propertyId,
      ...dto,
    });
    const saved = await this.ratePlanRepo.save(ratePlan);

    await this.auditRepo.save({
      actorId,
      action: 'rate_plan.create',
      entityType: 'rate_plans',
      entityId: saved.id,
      after: saved as unknown as Record<string, unknown>,
    });

    return saved;
  }

  async getRatePlans(propertyId: string): Promise<RatePlan[]> {
    return this.ratePlanRepo.find({
      where: { propertyId },
      order: { createdAt: 'DESC' },
    });
  }

  async getRatePlan(propertyId: string, id: string): Promise<RatePlan> {
    const ratePlan = await this.ratePlanRepo.findOne({
      where: { id, propertyId },
    });
    if (!ratePlan) {
      throw new NotFoundException(`Rate plan not found`);
    }
    return ratePlan;
  }

  async updateRatePlan(
    propertyId: string,
    id: string,
    dto: UpdateRatePlanDto,
    actorId: string,
  ): Promise<RatePlan> {
    const ratePlan = await this.getRatePlan(propertyId, id);
    const before = { ...ratePlan };

    Object.assign(ratePlan, dto);
    const saved = await this.ratePlanRepo.save(ratePlan);

    await this.auditRepo.save({
      actorId,
      action: 'rate_plan.update',
      entityType: 'rate_plans',
      entityId: id,
      before: before as unknown as Record<string, unknown>,
      after: saved as unknown as Record<string, unknown>,
    });

    return saved;
  }

  async deleteRatePlan(propertyId: string, id: string, actorId: string): Promise<{ success: boolean }> {
    const ratePlan = await this.getRatePlan(propertyId, id);

    await this.ratePlanRepo.remove(ratePlan);

    await this.auditRepo.save({
      actorId,
      action: 'rate_plan.delete',
      entityType: 'rate_plans',
      entityId: id,
      before: ratePlan as unknown as Record<string, unknown>,
    });

    return { success: true };
  }
}
