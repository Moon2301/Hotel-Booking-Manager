import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ReviewStatus } from './entities/review.entity';
import { ReviewService } from './review.service';

@ApiTags('Public Reviews')
@Controller('public/reviews')
export class PublicReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get()
  @ApiOperation({ summary: 'List published reviews for a property (public)' })
  @ApiQuery({ name: 'propertyId', required: true })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getPublicReviews(
    @Query('propertyId') propertyId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reviewService.getReviews(
      propertyId,
      ReviewStatus.PUBLISHED,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 12,
    );
  }
}

