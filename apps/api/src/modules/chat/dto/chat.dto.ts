import { IsString, IsUUID, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateThreadDto {
  @ApiProperty()
  @IsUUID()
  propertyId: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  bookingId?: string;
}

export class SendMessageDto {
  @ApiProperty()
  @IsUUID()
  threadId: string;

  @ApiProperty()
  @IsString()
  @MaxLength(2000)
  content: string;
}
