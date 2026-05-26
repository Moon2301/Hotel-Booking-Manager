import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateBookingChargeDto {
  @ApiPropertyOptional({ description: 'Service item from catalog (optional)' })
  @IsOptional()
  @IsUUID()
  serviceItemId?: string;

  @ApiPropertyOptional({ description: 'Custom description (if not using catalog)' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  description?: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  quantity: number = 1;

  @ApiPropertyOptional({
    example: 50000,
    description: 'Unit price (VND). Optional if serviceItemId is provided.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  unitPrice?: number;
}

export class VoidChargeDto {
  @ApiPropertyOptional({ description: 'Reason' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  reason?: string;
}

