import { IsString, IsNumber, IsBoolean, IsDateString, IsOptional, ValidateNested, IsArray, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class DailyRateDto {
  @ApiProperty()
  @IsString()
  roomTypeId: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  ratePlanId?: string;

  @ApiProperty({ example: '2025-10-01' })
  @IsDateString()
  night: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ default: true })
  @IsBoolean()
  @IsOptional()
  taxIncluded?: boolean;

  @ApiProperty({ default: 1 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  minStay?: number;

  @ApiProperty({ default: false })
  @IsBoolean()
  @IsOptional()
  closedToArrival?: boolean;
}

export class BulkUpdateRatesDto {
  @ApiProperty({ type: [DailyRateDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DailyRateDto)
  rates: DailyRateDto[];
}
