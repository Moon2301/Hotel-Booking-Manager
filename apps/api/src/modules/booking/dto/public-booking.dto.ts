import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsUUID,
  IsDateString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CreateHoldDto } from './booking.dto';

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
}

export { CreateHoldDto as PublicCreateHoldDto };
