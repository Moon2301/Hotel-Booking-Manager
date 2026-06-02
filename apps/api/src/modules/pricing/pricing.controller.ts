import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';
import { PricingService } from './pricing.service';
import { BulkUpdateRatesDto, CreateRatePlanDto, UpdateRatePlanDto } from './dto/pricing.dto';
import { JwtAuthGuard, Auth } from '../auth/guards/jwt-auth.guard';
import { UserRole } from '../auth/entities/user.entity';

@ApiTags('Pricing & Rates')
@Controller('properties/:propertyId')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  // ─── Daily Rates ──────────────────────────────────────────────────────────

  @Get('rates')
  @Auth(
    UserRole.SUPER_ADMIN,
    UserRole.PROPERTY_MANAGER,
    UserRole.FINANCE_READ,
  )
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

  @Put('rates/bulk')
  @Auth(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER)
  @ApiOperation({ summary: 'Bulk update daily rates' })
  bulkUpdateRates(
    @Param('propertyId') propertyId: string,
    @Body() dto: BulkUpdateRatesDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.pricingService.bulkUpdateRates(propertyId, dto, req.user.id);
  }

  // ─── Rate Plans ───────────────────────────────────────────────────────────

  @Post('rate-plans')
  @Auth(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER)
  @ApiOperation({ summary: 'Create a new rate plan for a property' })
  createRatePlan(
    @Param('propertyId') propertyId: string,
    @Body() dto: CreateRatePlanDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.pricingService.createRatePlan(propertyId, dto, req.user.id);
  }

  @Get('rate-plans')
  @ApiOperation({ summary: 'List all rate plans for a property' })
  getRatePlans(@Param('propertyId') propertyId: string) {
    return this.pricingService.getRatePlans(propertyId);
  }

  @Get('rate-plans/:planId')
  @ApiOperation({ summary: 'Get rate plan details' })
  getRatePlan(
    @Param('propertyId') propertyId: string,
    @Param('planId') planId: string,
  ) {
    return this.pricingService.getRatePlan(propertyId, planId);
  }

  @Patch('rate-plans/:planId')
  @Auth(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER)
  @ApiOperation({ summary: 'Update a rate plan' })
  updateRatePlan(
    @Param('propertyId') propertyId: string,
    @Param('planId') planId: string,
    @Body() dto: UpdateRatePlanDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.pricingService.updateRatePlan(propertyId, planId, dto, req.user.id);
  }

  @Delete('rate-plans/:planId')
  @Auth(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a rate plan' })
  deleteRatePlan(
    @Param('propertyId') propertyId: string,
    @Param('planId') planId: string,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.pricingService.deleteRatePlan(propertyId, planId, req.user.id);
  }
}
