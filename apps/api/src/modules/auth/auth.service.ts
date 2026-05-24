import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User, UserRole } from './entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { AuditLog } from './entities/audit-log.entity';
import { Guest } from '../guest/entities/guest.entity';
import { Booking } from '../booking/entities/booking.entity';
import {
  LoginDto,
  CreateUserDto,
  UpdateUserDto,
  ChangePasswordDto,
  ListUsersQueryDto,
} from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(RefreshToken) private rtRepo: Repository<RefreshToken>,
    @InjectRepository(AuditLog) private auditRepo: Repository<AuditLog>,
    @InjectRepository(Guest) private guestRepo: Repository<Guest>,
    @InjectRepository(Booking) private bookingRepo: Repository<Booking>,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  // ─── Auth ──────────────────────────────────────────────────────────────────

  async login(dto: LoginDto, ip: string) {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });

    if (!user || user.lockedAt) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user);

    await this.auditRepo.save(
      this.auditRepo.create({
        actorId: user.id,
        action: 'auth.login',
        entityType: 'users',
        entityId: user.id,
        after: { ip },
      }),
    );

    return tokens;
  }

  async refresh(rawRefreshToken: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(rawRefreshToken, {
        secret: this.config.get<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokenHash = this.hashToken(rawRefreshToken);
    const stored = await this.rtRepo.findOne({
      where: { tokenHash, userId: payload.sub },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired or revoked');
    }

    // Revoke old token (rotation)
    stored.revokedAt = new Date();
    await this.rtRepo.save(stored);

    const user = await this.userRepo.findOneOrFail({
      where: { id: payload.sub },
    });

    // Check tokenVersion matches (covers manual revoke-all)
    if (payload.tokenVersion !== user.tokenVersion) {
      throw new UnauthorizedException('Session invalidated');
    }

    return this.generateTokens(user);
  }

  async logout(userId: string) {
    // Revoke all refresh tokens for this user
    await this.rtRepo
      .createQueryBuilder()
      .update()
      .set({ revokedAt: new Date() })
      .where('user_id = :userId AND revoked_at IS NULL', { userId })
      .execute();

    // Bump tokenVersion to invalidate all existing JWTs
    await this.userRepo.increment({ id: userId }, 'tokenVersion', 1);
  }

  // ─── User Management ───────────────────────────────────────────────────────

  async createUser(dto: CreateUserDto, actorId: string) {
    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.userRepo.create({
      email: dto.email,
      passwordHash,
      fullName: dto.fullName,
      role: dto.role,
    });

    const saved = await this.userRepo.save(user);

    await this.auditRepo.save(
      this.auditRepo.create({
        actorId,
        action: 'user.create',
        entityType: 'users',
        entityId: saved.id,
        after: { email: saved.email, role: saved.role },
      }),
    );

    const { passwordHash: _, ...result } = saved;
    return result;
  }

  async listUsers(query: ListUsersQueryDto) {
    const { role, search, page = 1, limit = 20 } = query;

    const qb = this.userRepo.createQueryBuilder('user');

    if (role) {
      qb.andWhere('user.role = :role', { role });
    }

    if (search) {
      qb.andWhere(
        '(user.email ILIKE :search OR user.full_name ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    qb.orderBy('user.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .select([
        'user.id',
        'user.email',
        'user.fullName',
        'user.role',
        'user.lockedAt',
        'user.createdAt',
        'user.updatedAt',
      ]);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUser(id: string) {
    const user = await this.userRepo.findOne({
      where: { id },
      select: ['id', 'email', 'fullName', 'role', 'lockedAt', 'createdAt', 'updatedAt'],
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateUser(id: string, dto: UpdateUserDto, actorId: string) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const before = { fullName: user.fullName, role: user.role };

    if (dto.fullName !== undefined) user.fullName = dto.fullName;
    if (dto.role !== undefined) user.role = dto.role;

    const saved = await this.userRepo.save(user);

    await this.auditRepo.save(
      this.auditRepo.create({
        actorId,
        action: 'user.update',
        entityType: 'users',
        entityId: id,
        before,
        after: { fullName: saved.fullName, role: saved.role },
      }),
    );

    const { passwordHash: _, ...result } = saved;
    return result;
  }

  async lockUser(id: string, actorId: string) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    if (id === actorId) {
      throw new BadRequestException('Cannot lock your own account');
    }

    user.lockedAt = new Date();
    await this.userRepo.save(user);

    // Revoke all refresh tokens
    await this.rtRepo
      .createQueryBuilder()
      .update()
      .set({ revokedAt: new Date() })
      .where('user_id = :id AND revoked_at IS NULL', { id })
      .execute();

    await this.auditRepo.save(
      this.auditRepo.create({
        actorId,
        action: 'user.lock',
        entityType: 'users',
        entityId: id,
        after: { lockedAt: user.lockedAt },
      }),
    );

    return { success: true };
  }

  async unlockUser(id: string, actorId: string) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    user.lockedAt = null as any;
    await this.userRepo.save(user);

    await this.auditRepo.save(
      this.auditRepo.create({
        actorId,
        action: 'user.unlock',
        entityType: 'users',
        entityId: id,
        after: { lockedAt: null },
      }),
    );

    return { success: true };
  }

  async getMe(userId: string) {
    return this.getUser(userId);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const valid = await bcrypt.compare(dto.oldPassword, user.passwordHash);
    if (!valid) throw new BadRequestException('Current password is incorrect');

    user.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    // Bump tokenVersion to invalidate all existing sessions
    user.tokenVersion += 1;
    await this.userRepo.save(user);

    // Revoke all refresh tokens
    await this.rtRepo
      .createQueryBuilder()
      .update()
      .set({ revokedAt: new Date() })
      .where('user_id = :userId AND revoked_at IS NULL', { userId })
      .execute();

    return { success: true };
  }

  // ─── Guest Auth ──────────────────────────────────────────────────────────

  async guestLogin(bookingId: string, phone: string) {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId },
      relations: ['guest'],
    });

    if (!booking || !booking.guest) {
      throw new UnauthorizedException('Invalid booking ID or phone number');
    }

    if (booking.guest.phone !== phone) {
      throw new UnauthorizedException('Invalid booking ID or phone number');
    }

    const payload = {
      sub: booking.guest.id,
      type: 'guest',
      bookingId: booking.id,
      guestId: booking.guest.id,
      phone: booking.guest.phone,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.get<string>('jwt.accessSecret'),
      expiresIn: '7d', // Longer expiry for guest portal
    });

    return {
      accessToken,
      guest: {
        id: booking.guest.id,
        fullName: booking.guest.fullName,
        email: booking.guest.email,
        phone: booking.guest.phone,
      },
      booking: {
        id: booking.id,
        propertyId: booking.propertyId,
        roomTypeId: booking.roomTypeId,
        roomId: booking.roomId,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        status: booking.status,
      },
    };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async generateTokens(user: User) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      tokenVersion: user.tokenVersion,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.get<string>('jwt.accessSecret'),
      expiresIn: this.config.get<string>('jwt.accessExpiresIn', '15m'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.get<string>('jwt.refreshSecret'),
      expiresIn: this.config.get<string>('jwt.refreshExpiresIn', '7d'),
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.rtRepo.save(
      this.rtRepo.create({
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        expiresAt,
      }),
    );

    return { accessToken, refreshToken };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
