import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { PublicBookingService } from './public-booking.service';
import {
  PublicCheckoutDto,
  PublicCheckoutGroupDto,
  PublicCreateHoldDto,
  PublicQuoteQueryDto,
  PublicDailyAvailabilityQueryDto,
} from './dto/public-booking.dto';
import { AvailabilityQueryDto } from './dto/booking.dto';

@ApiTags('Public Booking')
@Controller('public')
export class PublicBookingController {
  constructor(private readonly publicBookingService: PublicBookingService) {}

  @Get('catalog')
  @ApiOperation({ summary: 'List properties and room types for booking' })
  getCatalog() {
    return this.publicBookingService.getCatalog();
  }

  @Get('availability')
  @ApiOperation({ summary: 'Check room availability (public)' })
  checkAvailability(@Query() query: AvailabilityQueryDto) {
    return this.publicBookingService.checkAvailability(query);
  }

  @Get('availability/calendar')
  @ApiOperation({
    summary: 'Per-day availability by room type (calendar highlights)',
  })
  getAvailabilityCalendar(@Query() query: AvailabilityQueryDto) {
    return this.publicBookingService.getAvailabilityCalendar(
      query.propertyId,
      query.from,
      query.to,
    );
  @Get('daily-availability')
  @ApiOperation({ summary: 'Check room availability day-by-day (public)' })
  getDailyAvailability(@Query() query: PublicDailyAvailabilityQueryDto) {
    return this.publicBookingService.getDailyAvailability(query);
  }

  @Get('quote')
  @ApiOperation({ summary: 'Estimate stay total before hold' })
  getQuote(@Query() query: PublicQuoteQueryDto) {
    return this.publicBookingService.getQuote(query);
  }

  @Post('holds')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Create a room hold (public, no login)' })
  createHold(@Body() dto: PublicCreateHoldDto) {
    return this.publicBookingService.createHold(dto);
  }

  @Post('checkout')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Confirm booking from hold, create invoice, return VNPay URL',
  })
  checkout(@Body() dto: PublicCheckoutDto, @Req() req: Request) {
    const ipAddr =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      '127.0.0.1';
    return this.publicBookingService.checkout(dto, ipAddr);
  }

  @Post('checkout-group')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary:
      'Đặt nhiều phòng (cùng/khác loại) — một hóa đơn & thanh toán VNPay',
  })
  checkoutGroup(@Body() dto: PublicCheckoutGroupDto, @Req() req: Request) {
    const ipAddr =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      '127.0.0.1';
    return this.publicBookingService.checkoutGroup(dto, ipAddr);
  }

  @Get('confirmation/:bookingId')
  @ApiOperation({
    summary: 'Get booking confirmation (requires matching phone)',
  })
  getConfirmation(
    @Param('bookingId') bookingId: string,
    @Query('phone') phone: string,
  ) {
    return this.publicBookingService.getConfirmation(bookingId, phone);
  }
}
