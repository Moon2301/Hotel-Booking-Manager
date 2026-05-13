import { IsString, IsNumber, IsUUID, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePaymentIntentDto {
  @ApiProperty()
  @IsUUID()
  bookingId: string;

  @ApiProperty()
  @IsNumber()
  amount: number;
}

export enum WebhookProvider {
  STRIPE = 'STRIPE',
  VNPAY = 'VNPAY',
  MOMO = 'MOMO',
}

// For webhook payloads, the structure depends on the provider.
// We typically accept raw JSON and validate HMAC.
export class PaymentWebhookDto {
  @ApiProperty()
  @IsString()
  eventId: string;

  @ApiProperty()
  @IsEnum(WebhookProvider)
  provider: WebhookProvider;

  @ApiProperty()
  @IsString()
  bookingId: string;

  @ApiProperty()
  @IsString()
  status: string;
}
