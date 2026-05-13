import { IsString, IsNumber, IsUUID, IsEnum, IsOptional, Min, Max, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ReviewStatus } from '../entities/review.entity';

export class CreateReviewDto {
  @ApiProperty()
  @IsUUID()
  bookingId: string;

  @ApiProperty()
  @IsUUID()
  propertyId: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({ required: false })
  @IsString()
  @Length(10, 2000)
  @IsOptional()
  content?: string;
  
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  deviceFingerprint?: string;
}

export class ModerateReviewDto {
  @ApiProperty({ enum: [ReviewStatus.PUBLISHED, ReviewStatus.HIDDEN, ReviewStatus.FLAGGED] })
  @IsEnum(ReviewStatus)
  status: ReviewStatus;

  @ApiProperty({ required: false, description: 'Required if hiding' })
  @IsString()
  @IsOptional()
  reason?: string;
}
