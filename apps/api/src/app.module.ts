import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { PropertyModule } from './modules/property/property.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { BookingModule } from './modules/booking/booking.module';
import { PaymentModule } from './modules/payment/payment.module';
import { ReviewModule } from './modules/review/review.module';
import { NotificationModule } from './modules/notification/notification.module';
import { ChatModule } from './modules/chat/chat.module';
import { GuestModule } from './modules/guest/guest.module';
import { ChannelModule } from './modules/channel/channel.module';
import { UploadModule } from './modules/upload/upload.module';
import appConfig from './config/app.config';

@Module({
  imports: [
    // ─── Core Config ───────────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      envFilePath: ['.env', '../../.env'],
    }),

    // ─── Rate Limiting ─────────────────────────────────────────────────────
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 60_000,
        limit: 60,
      },
      {
        name: 'login',
        ttl: 60_000,
        limit: 5, // 5 login attempts per minute per IP
      },
    ]),

    // ─── Scheduled Jobs ────────────────────────────────────────────────────
    ScheduleModule.forRoot(),

    // ─── Infrastructure ────────────────────────────────────────────────────
    DatabaseModule,
    RedisModule,

    // ─── Health ────────────────────────────────────────────────────────────
    HealthModule,

    // ─── Domain Modules ────────────────────────────────────────────────────
    AuthModule,
    GuestModule,
    PropertyModule,
    PricingModule,
    BookingModule,
    PaymentModule,
    ReviewModule,
    NotificationModule,
    ChatModule,
    ChannelModule,
    UploadModule,
  ],
})
export class AppModule {}

