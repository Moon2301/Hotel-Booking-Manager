import {
  IsString,
  IsArray,
  IsDateString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsNotEmpty,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { BookingStatus } from '../entities/booking.entity';

export class CreateHoldDto {
  @ApiProperty()
  @IsUUID()
  propertyId: string;

  @ApiProperty()
  @IsUUID()
  roomTypeId: string;

  @ApiProperty({ type: [String], example: ['2025-10-01', '2025-10-02'] })
  @IsArray()
  @IsDateString({}, { each: true })
  nights: string[];
}

export class ConfirmBookingDto {
  @ApiProperty()
  @IsUUID()
  holdId: string;

  @ApiProperty()
  @IsUUID()
  guestId: string;
}

export class AvailabilityQueryDto {
  @ApiProperty()
  @IsUUID()
  propertyId: string;

  @ApiProperty({ example: '2025-10-01' })
  @IsDateString()
  from: string;

  @ApiProperty({ example: '2025-10-05' })
  @IsDateString()
  to: string;
}

export class ListBookingsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @ApiPropertyOptional({ enum: BookingStatus })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  guestId?: string;

  @ApiPropertyOptional({ example: '2025-10-01', description: 'Filter bookings with check-in >= this date' })
  @IsOptional()
  @IsDateString()
  checkInFrom?: string;

  @ApiPropertyOptional({ example: '2025-12-31', description: 'Filter bookings with check-in <= this date' })
  @IsOptional()
  @IsDateString()
  checkInTo?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class CancelBookingDto {
  @ApiPropertyOptional({ description: 'Reason for cancellation' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  reason?: string;
}

export class CheckInDto {
  @ApiPropertyOptional({ description: 'Specific room ID to assign. Auto-assigned if omitted.' })
  @IsOptional()
  @IsUUID()
  roomId?: string;
}

export class CreateCancellationPolicyDto {
  @ApiPropertyOptional({ default: 24 })
  @IsOptional()
  @IsInt()
  @Min(0)
  freeCancelUntilHoursBeforeCheckin?: number = 24;

  @ApiPropertyOptional({ example: { nights_penalty: 1 } })
  @IsOptional()
  feeRuleRef?: Record<string, any>;

  @ApiPropertyOptional({ example: { penalty_percentage: 100 } })
  @IsOptional()
  noShowRule?: Record<string, any>;
}

export class UpdateCancellationPolicyDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  freeCancelUntilHoursBeforeCheckin?: number;

  @ApiPropertyOptional()
  @IsOptional()
  feeRuleRef?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  noShowRule?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
