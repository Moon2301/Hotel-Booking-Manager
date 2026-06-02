import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReferralPartner } from './entities/referral-partner.entity';
import { PartnerCommission } from './entities/partner-commission.entity';
import { Booking } from '../booking/entities/booking.entity';
import { PartnerService } from './partner.service';
import { PartnerCommissionService } from './partner-commission.service';
import { PartnerController } from './partner.controller';
import { PublicPartnerController } from './public-partner.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReferralPartner, PartnerCommission, Booking]),
  ],
  controllers: [PartnerController, PublicPartnerController],
  providers: [PartnerService, PartnerCommissionService],
  exports: [PartnerService, PartnerCommissionService],
})
export class PartnerModule {}
