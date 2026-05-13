import { Controller, Get, Post, Body, Param, Query, UseGuards, Req, Delete, Headers, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { Request } from 'express';
import * as crypto from 'crypto';
import { BookingService } from './booking.service';
import { CreateHoldDto, ConfirmBookingDto, AvailabilityQueryDto } from './dto/booking.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Booking')
@Controller()
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Get('availability')
  @ApiOperation({ summary: 'Check room availability' })
  checkAvailability(@Query() query: AvailabilityQueryDto) {
    return this.bookingService.checkAvailability(query);
  }

  @Post('holds')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a booking hold' })
  createHold(@Body() dto: CreateHoldDto) {
    return this.bookingService.createHold(dto);
  }

  @Delete('holds/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Release a booking hold early' })
  releaseHold(@Param('id') id: string) {
    return this.bookingService.releaseHold(id);
  }

  @Post('bookings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Confirm a booking from a hold' })
  @ApiHeader({ name: 'Idempotency-Key', required: true, description: 'Unique UUID for idempotency' })
  createBooking(
    @Headers('Idempotency-Key') idempotencyKey: string,
    @Body() dto: ConfirmBookingDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException('Idempotency-Key header is required');
    }
    
    // Hash the payload for idempotency checking
    const requestHash = crypto.createHash('sha256').update(JSON.stringify(dto)).digest('hex');
    
    return this.bookingService.createBooking(idempotencyKey, dto, requestHash, req.user.id);
  }

  @Get('bookings/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get booking details' })
  getBooking(@Param('id') id: string) {
    return this.bookingService.getBooking(id);
  }
}
