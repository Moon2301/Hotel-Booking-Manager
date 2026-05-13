import { Controller, Post, Body, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { NotificationService } from './notification.service';
import { RegisterTokenDto, RevokeTokenDto } from './dto/notification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('tokens')
  @ApiOperation({ summary: 'Register an Expo push token for the current user' })
  registerToken(
    @Body() dto: RegisterTokenDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.notificationService.registerToken(req.user.id, dto);
  }

  @Post('tokens/revoke')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke a push token for a specific device' })
  revokeToken(
    @Body() dto: RevokeTokenDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.notificationService.revokeToken(req.user.id, dto);
  }
}
