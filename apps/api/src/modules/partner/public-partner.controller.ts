import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PartnerCommissionService } from './partner-commission.service';

@ApiTags('Public Partners')
@Controller('public/partners')
export class PublicPartnerController {
  constructor(
    private readonly commissionService: PartnerCommissionService,
  ) {}

  @Get('resolve')
  @ApiOperation({ summary: 'Validate referral code from ?ref=' })
  @ApiQuery({ name: 'ref', required: true })
  resolve(@Query('ref') ref: string) {
    if (!ref?.trim()) {
      throw new BadRequestException('ref is required');
    }
    return this.commissionService.resolvePublicPartner(ref);
  }
}
