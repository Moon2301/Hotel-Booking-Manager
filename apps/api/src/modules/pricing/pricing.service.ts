import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { DailyRate, RateSource } from './entities/daily-rate.entity';
import { RatePlan } from './entities/rate-plan.entity';
import { BulkUpdateRatesDto } from './dto/pricing.dto';
import { AuditLog } from '../auth/entities/audit-log.entity';

@Injectable()
export class PricingService {
  constructor(
    @InjectRepository(DailyRate) private dailyRateRepo: Repository<DailyRate>,
    @InjectRepository(RatePlan) private ratePlanRepo: Repository<RatePlan>,
    @InjectRepository(AuditLog) private auditRepo: Repository<AuditLog>,
  ) {}

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
    // using query runner or transaction is better, but save() handles basic arrays
    const toSave = dto.rates.map(rate => {
      return this.dailyRateRepo.create({
        propertyId,
        ...rate,
        rateSource: RateSource.MANUAL,
      });
    });

    const saved = await this.dailyRateRepo.save(toSave);

    await this.auditRepo.save({
      actorId,
      action: 'pricing.bulk_update',
      entityType: 'daily_rate',
      entityId: propertyId, // Using propertyId as entity reference since it's a bulk operation
      after: { updatedCount: saved.length },
    });

    return saved;
  }
}
