import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DailyRate } from './entities/daily-rate.entity';
import { RatePlan } from './entities/rate-plan.entity';
import { AuditLog } from '../auth/entities/audit-log.entity';
import { PricingService } from './pricing.service';
import { PricingController } from './pricing.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DailyRate, RatePlan, AuditLog])],
  controllers: [PricingController],
  providers: [PricingService],
  exports: [PricingService, TypeOrmModule],
})
export class PricingModule {}
