import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsUUID,
  IsDateString,
  IsOptional,
  MaxLength,
  Matches,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CreateHoldDto } from './booking.dto';

export class PublicGroupLineDto {
  @ApiProperty()
  @IsUUID()
  roomTypeId: string;

  @ApiProperty({ example: 2, description: 'Số phòng cùng loại' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(8)
  quantity: number;
}

export class PublicQuoteQueryDto {
  @ApiProperty()
  @IsUUID()
  propertyId: string;

  @ApiProperty()
  @IsUUID()
  roomTypeId: string;

  @ApiProperty({ example: '2025-10-01' })
  @IsDateString()
  checkIn: string;

  @ApiProperty({ example: '2025-10-03' })
  @IsDateString()
  checkOut: string;
}

export class PublicCheckoutDto {
  @ApiProperty()
  @IsUUID()
  holdId: string;

  @ApiProperty({ example: 'Nguyen Van A' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: 'guest@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '0912345678' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional({
    example: 'du-lich-abc',
    description: 'Mã đối tác từ ?ref= trên website',
  })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  @Matches(/^[a-z0-9][a-z0-9-]{0,30}[a-z0-9]$|^[a-z0-9]{1,2}$/i, {
    message: 'partnerRef must be a valid referral code',
  })
  partnerRef?: string;
}

export class PublicCheckoutGroupDto {
  @ApiProperty()
  @IsUUID()
  propertyId: string;

  @ApiProperty({ example: '2026-06-10' })
  @IsDateString()
  checkIn: string;

  @ApiProperty({ example: '2026-06-12' })
  @IsDateString()
  checkOut: string;

  @ApiProperty({ type: [PublicGroupLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PublicGroupLineDto)
  lines: PublicGroupLineDto[];

  @ApiProperty({ example: 'Nguyen Van A' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: 'guest@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '0912345678' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  @Matches(/^[a-z0-9][a-z0-9-]{0,30}[a-z0-9]$|^[a-z0-9]{1,2}$/i)
  partnerRef?: string;
}

export { CreateHoldDto as PublicCreateHoldDto };
