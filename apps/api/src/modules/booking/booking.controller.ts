import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  Delete,
  Patch,
  Headers,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiHeader,
} from '@nestjs/swagger';
import { Request } from 'express';
import * as crypto from 'crypto';
import { BookingService } from './booking.service';
import { ReportingService } from './reporting.service';
import {
  CreateHoldDto,
  ConfirmBookingDto,
  AvailabilityQueryDto,
  ListBookingsQueryDto,
  CancelBookingDto,
  CheckInDto,
  AssignBookingRoomDto,
  CreateCancellationPolicyDto,
  UpdateCancellationPolicyDto,
} from './dto/booking.dto';
import { Auth, JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserRole } from '../auth/entities/user.entity';

@ApiTags('Booking')
@Controller()
export class BookingController {
  constructor(
    private readonly bookingService: BookingService,
    private readonly reportingService: ReportingService,
  ) {}

  // ─── Reporting ────────────────────────────────────────────────────────────

  @Get('reports/performance')
  @Auth(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get ADR and Occupancy reports for a date range' })
  getPerformanceReport(
    @Query('propertyId') propertyId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportingService.getPerformanceMetrics(propertyId, startDate, endDate);
  }

  @Get('reports/daily-chart')
  @Auth(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get daily chart data for Recharts' })
  getDailyChartData(
    @Query('propertyId') propertyId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportingService.getDailyChartData(propertyId, startDate, endDate);
  }

  // ─── Availability ─────────────────────────────────────────────────────────

  @Get('availability')
  @ApiOperation({ summary: 'Check room availability' })
  checkAvailability(@Query() query: AvailabilityQueryDto) {
    return this.bookingService.checkAvailability(query);
  }

  // ─── Holds ────────────────────────────────────────────────────────────────

  @Post('holds')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a booking hold (double-booking safe)' })
  createHold(@Body() dto: CreateHoldDto) {
    return this.bookingService.createHold(dto);
  }

  @Get('holds')
  @Auth(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER, UserRole.FRONT_DESK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List active holds (admin monitor — for TTL countdown widget)' })
  listActiveHolds(@Query('propertyId') propertyId?: string) {
    return this.bookingService.listActiveHolds(propertyId);
  }

  @Delete('holds/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Release a booking hold early' })
  releaseHold(@Param('id') id: string) {
    return this.bookingService.releaseHold(id);
  }

  @Get('properties/:propertyId/rooms/:roomId/folio')
  @Auth(
    UserRole.SUPER_ADMIN,
    UserRole.PROPERTY_MANAGER,
    UserRole.FRONT_DESK,
    UserRole.SUPPORT,
    UserRole.HOUSEKEEPING,
  )
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Get room folio: who is staying, charges, and invoices (for admin room board)',
  })
  getRoomFolio(
    @Param('propertyId') propertyId: string,
    @Param('roomId') roomId: string,
  ) {
    return this.bookingService.getRoomFolio(propertyId, roomId);
  }

  // ─── Bookings ─────────────────────────────────────────────────────────────

  @Get('bookings')
  @Auth(
    UserRole.SUPER_ADMIN,
    UserRole.PROPERTY_MANAGER,
    UserRole.FRONT_DESK,
    UserRole.FINANCE_READ,
  )
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List bookings with filters and pagination' })
  listBookings(@Query() query: ListBookingsQueryDto) {
    return this.bookingService.listBookings(query);
  }

  @Post('bookings/sync-paid')
  @Auth(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER, UserRole.FRONT_DESK)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Auto-assign RESERVED rooms for PAID bookings (incl. stale > 30 min)',
  })
  syncPaidBookings(
    @Query('propertyId') propertyId: string | undefined,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.bookingService.syncPaidBookings(propertyId, req.user.id);
  }

  @Post('bookings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Confirm a booking from a hold' })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    description: 'Unique UUID for idempotency',
  })
  createBooking(
    @Headers('Idempotency-Key') idempotencyKey: string,
    @Body() dto: ConfirmBookingDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException('Idempotency-Key header is required');
    }
    const requestHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(dto))
      .digest('hex');
    return this.bookingService.createBooking(
      idempotencyKey,
      dto,
      requestHash,
      req.user.id,
    );
  }

  @Get('bookings/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get booking details' })
  getBooking(@Param('id') id: string) {
    return this.bookingService.getBooking(id);
  }

  @Patch('bookings/:id/cancel')
  @Auth(
    UserRole.SUPER_ADMIN,
    UserRole.PROPERTY_MANAGER,
    UserRole.FRONT_DESK,
  )
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a booking (calculates fee from policy snapshot)' })
  cancelBooking(
    @Param('id') id: string,
    @Body() dto: CancelBookingDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.bookingService.cancelBooking(id, dto, req.user.id);
  }

  @Patch('bookings/:id/room')
  @Auth(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER, UserRole.FRONT_DESK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reassign physical room for a PAID booking' })
  reassignBookingRoom(
    @Param('id') id: string,
    @Body() dto: AssignBookingRoomDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.bookingService.reassignBookingRoom(id, dto.roomId, req.user.id);
  }

  @Post('bookings/:id/assign-room')
  @Auth(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER, UserRole.FRONT_DESK)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign first available room for a PAID booking' })
  assignRoom(
    @Param('id') id: string,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.bookingService.assignRoomOnPayment(id, req.user.id);
  }

  @Patch('bookings/:id/check-in')
  @Auth(UserRole.SUPER_ADMIN, UserRole.FRONT_DESK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check in a guest (assigns physical room)' })
  checkIn(
    @Param('id') id: string,
    @Body() dto: CheckInDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.bookingService.checkIn(id, dto, req.user.id);
  }

  @Patch('bookings/:id/check-out')
  @Auth(UserRole.SUPER_ADMIN, UserRole.FRONT_DESK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check out a guest (sets room to CLEANING)' })
  checkOut(
    @Param('id') id: string,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.bookingService.checkOut(id, req.user.id);
  }

  @Patch('bookings/:id/no-show')
  @Auth(UserRole.SUPER_ADMIN, UserRole.FRONT_DESK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark a booking as no-show' })
  markNoShow(
    @Param('id') id: string,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.bookingService.markNoShow(id, req.user.id);
  }

  // ─── Cancellation Policies ─────────────────────────────────────────────────

  @Post('properties/:propertyId/cancellation-policies')
  @Auth(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new cancellation policy (auto de-activates previous ones)' })
  createCancellationPolicy(
    @Param('propertyId') propertyId: string,
    @Body() dto: CreateCancellationPolicyDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.bookingService.createCancellationPolicy(propertyId, dto, req.user.id);
  }

  @Get('properties/:propertyId/cancellation-policies')
  @Auth(
    UserRole.SUPER_ADMIN,
    UserRole.PROPERTY_MANAGER,
    UserRole.FRONT_DESK,
  )
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all cancellation policies for a property' })
  getCancellationPolicies(@Param('propertyId') propertyId: string) {
    return this.bookingService.getCancellationPolicies(propertyId);
  }

  @Get('properties/:propertyId/cancellation-policies/active')
  @Auth(
    UserRole.SUPER_ADMIN,
    UserRole.PROPERTY_MANAGER,
    UserRole.FRONT_DESK,
  )
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current active cancellation policy for a property' })
  getActiveCancellationPolicy(@Param('propertyId') propertyId: string) {
    return this.bookingService.getActiveCancellationPolicy(propertyId);
  }

  @Patch('properties/:propertyId/cancellation-policies/:policyId')
  @Auth(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a cancellation policy' })
  updateCancellationPolicy(
    @Param('propertyId') propertyId: string,
    @Param('policyId') policyId: string,
    @Body() dto: UpdateCancellationPolicyDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.bookingService.updateCancellationPolicy(propertyId, policyId, dto, req.user.id);
  }

  // ─── Digital Check-in (QR / PIN) ──────────────────────────────────────────

  @Post('bookings/:id/generate-checkin-token')
  @Auth(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER, UserRole.FRONT_DESK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate a JWT token and PIN for digital self check-in' })
  generateCheckinToken(
    @Param('id') id: string,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.bookingService.generateCheckinToken(id, req.user.id);
  }

  @Post('bookings/self-checkin')
  @ApiOperation({ summary: 'Perform self check-in using QR token or PIN' })
  selfCheckIn(@Body() dto: { token?: string; pin?: string; bookingId?: string }) {
    return this.bookingService.selfCheckIn(dto);
  }
}
