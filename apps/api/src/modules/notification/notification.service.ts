import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import Expo, { ExpoPushMessage } from 'expo-server-sdk';
import { DeviceToken } from './entities/device-token.entity';
import { RegisterTokenDto, RevokeTokenDto } from './dto/notification.dto';

@Injectable()
export class NotificationService {
  private expo: Expo;
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(DeviceToken) private tokenRepo: Repository<DeviceToken>,
    private config: ConfigService,
  ) {
    const accessToken = this.config.get<string>('expo.accessToken');
    this.expo = new Expo({ accessToken });
  }

  async registerToken(userId: string, dto: RegisterTokenDto) {
    let token = await this.tokenRepo.findOne({
      where: { userId, deviceId: dto.deviceId },
    });

    if (token) {
      token.expoToken = dto.expoToken;
      token.platform = dto.platform ?? 'ios';
      token.revokedAt = null as any;
    } else {
      token = this.tokenRepo.create({
        userId,
        ...dto,
        platform: dto.platform ?? 'ios',
      });
    }

    return this.tokenRepo.save(token);
  }

  async revokeToken(userId: string, dto: RevokeTokenDto) {
    const token = await this.tokenRepo.findOne({
      where: { userId, deviceId: dto.deviceId },
    });

    if (token && !token.revokedAt) {
      token.revokedAt = new Date();
      await this.tokenRepo.save(token);
    }
    return { success: true };
  }

  async sendPushNotification(userId: string, type: string, bookingId?: string, deepLink?: string) {
    const tokens = await this.tokenRepo.find({
      where: { userId, revokedAt: IsNull() },
    });

    if (!tokens.length) return;

    const messages: ExpoPushMessage[] = [];
    for (const pushToken of tokens) {
      if (!Expo.isExpoPushToken(pushToken.expoToken)) {
        this.logger.error(`Push token ${pushToken.expoToken} is not a valid Expo push token`);
        continue;
      }

      messages.push({
        to: pushToken.expoToken,
        sound: 'default',
        body: 'You have a new update regarding your booking.',
        data: { type, bookingId, deepLink }, // No sensitive PII
      });
    }

    try {
      const chunks = this.expo.chunkPushNotifications(messages);
      const tickets: any[] = [];
      for (const chunk of chunks) {
        try {
          const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
          tickets.push(...ticketChunk);
        } catch (error) {
          this.logger.error('Error sending chunk', error);
        }
      }
      
      // We could log tickets to DB here to handle receipts later
      this.logger.log(`Sent ${tickets.length} push notifications`);
    } catch (error) {
      this.logger.error('Error sending push notifications', error);
    }
  }
}
