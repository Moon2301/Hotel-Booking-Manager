import { IsString, IsArray, IsDateString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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
