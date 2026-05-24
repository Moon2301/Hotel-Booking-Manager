import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import {
  LoginDto,
  RefreshTokenDto,
  CreateUserDto,
  UpdateUserDto,
  ChangePasswordDto,
  ListUsersQueryDto,
} from './dto/auth.dto';
import { Auth, JwtAuthGuard } from './guards/jwt-auth.guard';
import { UserRole } from './entities/user.entity';

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
  @ApiOperation({ summary: 'Guest login using booking ID + phone number' })
  async guestLogin(@Body() body: { bookingId: string; phone: string }) {
    return this.authService.guestLogin(body.bookingId, body.phone);
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

  // ─── User Management (Admin) ───────────────────────────────────────────────

  @Post('users')
  @Auth(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new staff user [SUPER_ADMIN only]' })
  async createUser(
    @Body() dto: CreateUserDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.authService.createUser(dto, req.user.id);
  }

  @Get('users')
  @Auth(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all users with optional filters' })
  async listUsers(@Query() query: ListUsersQueryDto) {
    return this.authService.listUsers(query);
  }

  @Get('users/:id')
  @Auth(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user details by ID' })
  async getUser(@Param('id') id: string) {
    return this.authService.getUser(id);
  }

  @Patch('users/:id')
  @Auth(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user fullName or role [SUPER_ADMIN only]' })
  async updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.authService.updateUser(id, dto, req.user.id);
  }

  @Delete('users/:id')
  @Auth(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lock (soft-disable) a user account [SUPER_ADMIN only]' })
  async lockUser(
    @Param('id') id: string,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.authService.lockUser(id, req.user.id);
  }

  @Patch('users/:id/unlock')
  @Auth(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unlock a locked user account [SUPER_ADMIN only]' })
  async unlockUser(
    @Param('id') id: string,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.authService.unlockUser(id, req.user.id);
  }
}
