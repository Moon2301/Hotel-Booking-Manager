import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GuestOnlyGuard } from '../auth/guards/guest-only.guard';
import { GuestStayService } from './guest-stay.service';
import { CreateGuestServiceRequestDto } from './dto/guest-charge.dto';

@ApiTags('Guest Stay')
@Controller('guest/me')
@UseGuards(JwtAuthGuard, GuestOnlyGuard)
@ApiBearerAuth()
export class GuestStayController {
  constructor(private readonly guestStayService: GuestStayService) {}

  @Get('service-items')
  @ApiOperation({ summary: 'Danh mục dịch vụ có thể yêu cầu (My Stay)' })
  listCatalog(@Req() req: Request & { user: { bookingId: string } }) {
    return this.guestStayService.listServiceCatalog(req.user.bookingId);
  }

  @Get('service-requests')
  @ApiOperation({ summary: 'Lịch sử yêu cầu dịch vụ của khách' })
  listRequests(@Req() req: Request & { user: { bookingId: string } }) {
    return this.guestStayService.listServiceRequests(req.user.bookingId);
  }

  @Post('service-requests')
  @ApiOperation({ summary: 'Gửi yêu cầu dịch vụ (ghi vào folio phòng)' })
  createRequest(
    @Req() req: Request & { user: { bookingId: string } },
    @Body() dto: CreateGuestServiceRequestDto,
  ) {
    return this.guestStayService.createServiceRequest(
      req.user.bookingId,
      dto,
    );
  }
}
