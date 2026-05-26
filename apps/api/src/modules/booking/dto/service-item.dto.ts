import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export enum ServiceCategoryDto {
  FOOD = 'FOOD',
  LAUNDRY = 'LAUNDRY',
  MINIBAR = 'MINIBAR',
  TRANSPORT = 'TRANSPORT',
  OTHER = 'OTHER',
}

export class CreateServiceItemDto {
  @ApiProperty({ example: 'Giặt ủi (bộ)' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ enum: ServiceCategoryDto, default: ServiceCategoryDto.OTHER })
  @IsOptional()
  @IsEnum(ServiceCategoryDto)
  category?: ServiceCategoryDto;

  @ApiPropertyOptional({ example: 'bộ', default: 'lần' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiProperty({ example: 80000 })
  @IsInt()
  @Min(0)
  unitPrice: number;

  @ApiPropertyOptional({ default: 'VND' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateServiceItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ enum: ServiceCategoryDto })
  @IsOptional()
  @IsEnum(ServiceCategoryDto)
  category?: ServiceCategoryDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  unitPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
