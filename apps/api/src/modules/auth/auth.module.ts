import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { User } from './entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { AuditLog } from './entities/audit-log.entity';
import { Guest } from '../guest/entities/guest.entity';
import { Booking } from '../booking/entities/booking.entity';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuditLogController } from './audit-log.controller';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, RefreshToken, AuditLog, Guest, Booking]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}), // secrets loaded dynamically in service
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController, AuditLogController],
  exports: [AuthService, TypeOrmModule, JwtModule],
})
export class AuthModule {}

