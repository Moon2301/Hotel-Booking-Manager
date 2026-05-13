import { Controller, Get, Put, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';
import { PricingService } from './pricing.service';
import { BulkUpdateRatesDto } from './dto/pricing.dto';
import { JwtAuthGuard, Auth } from '../auth/guards/jwt-auth.guard';
import { UserRole } from '../auth/entities/user.entity';

@ApiTags('Pricing & Rates')
@Controller('properties/:propertyId/rates')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Get()
  @ApiOperation({ summary: 'Get daily rates for a property within a date range' })
  @ApiQuery({ name: 'from', required: true, example: '2025-10-01' })
  @ApiQuery({ name: 'to', required: true, example: '2025-10-31' })
  getRates(
    @Param('propertyId') propertyId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.pricingService.getRates(propertyId, from, to);
  }

  @Put('bulk')
  @Auth(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER)
  @ApiOperation({ summary: 'Bulk update daily rates' })
  bulkUpdateRates(
    @Param('propertyId') propertyId: string,
    @Body() dto: BulkUpdateRatesDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.pricingService.bulkUpdateRates(propertyId, dto, req.user.id);
  }
}
