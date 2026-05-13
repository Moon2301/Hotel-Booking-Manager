import { IsString, IsOptional, IsInt, Min, IsArray, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RoomStatus } from '../entities/room.entity';

export class CreatePropertyDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ example: 'Asia/Ho_Chi_Minh', default: 'UTC' })
  @IsString()
  @IsOptional()
  ianaTimezone?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  email?: string;
}

export class CreateRoomTypeDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ default: 2 })
  @IsInt()
  @Min(1)
  maxOccupancy: number;

  @ApiProperty({ type: [String], required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  amenities?: string[];

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;
}

export class CreateRoomDto {
  @ApiProperty()
  @IsString()
  roomTypeId: string;

  @ApiProperty()
  @IsString()
  roomNumber: string;

  @ApiProperty({ required: false })
  @IsInt()
  @IsOptional()
  floor?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateRoomStatusDto {
  @ApiProperty({ enum: RoomStatus })
  @IsEnum(RoomStatus)
  status: RoomStatus;
}
