import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { AuthService } from './auth.service';
import {
  LoginDto,
  RefreshTokenDto,
  ChangePasswordDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Auth')
@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ─── Auth Endpoints ────────────────────────────────────────────────────────

  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login and receive JWT tokens' })
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const ip = req.ip ?? 'unknown';
    return this.authService.login(dto, ip);
  }

  @Post('auth/refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('auth/logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Logout and revoke all refresh tokens' })
  async logout(@Req() req: Request & { user: { id: string } }) {
    await this.authService.logout(req.user.id);
  }

  @Post('auth/guest-login')
  @HttpCode(HttpStatus.OK)
  // 5 attempts per minute per IP — stricter than global throttle to prevent
  // brute-forcing (bookingId, phone) pairs to gain unauthorized portal access.
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Guest login using booking ID + phone number' })
  async guestLogin(@Body() body: { bookingId: string; phone: string }) {
    return this.authService.guestLogin(body.bookingId, body.phone);
  }

  @Get('auth/guest-session')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refresh guest + booking data (incl. check-in QR)' })
  async guestSession(
    @Req() req: Request & { user: { type?: string; bookingId?: string; guestId?: string } },
  ) {
    if (req.user.type !== 'guest' || !req.user.bookingId || !req.user.guestId) {
      throw new UnauthorizedException('Guest session required');
    }
    return this.authService.getGuestSession(req.user.bookingId, req.user.guestId);
  }

  // ─── Current User ──────────────────────────────────────────────────────────

  @Get('users/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  async getMe(@Req() req: Request & { user: { id: string } }) {
    return this.authService.getMe(req.user.id);
  }

  @Patch('users/me/password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change own password (invalidates all sessions)' })
  async changePassword(
    @Req() req: Request & { user: { id: string } },
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(req.user.id, dto);
  }
}
