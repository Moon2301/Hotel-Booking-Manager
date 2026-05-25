import { Controller, Get, Post, Body, Param, Patch, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsEnum, IsInt, IsUUID, Min, Max } from 'class-validator';
import { Request } from 'express';
import { ReviewService } from './review.service';
import { CreateReviewDto, ModerateReviewDto } from './dto/review.dto';
import { ReviewStatus } from './entities/review.entity';
import { JwtAuthGuard, Auth } from '../auth/guards/jwt-auth.guard';
import { UserRole } from '../auth/entities/user.entity';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit a new review' })
  createReview(@Body() dto: CreateReviewDto, @Req() req: Request & { user: { id: string } }) {
    return this.reviewService.createReview(dto, req.user.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List reviews for a property' })
  @ApiQuery({ name: 'propertyId', required: false })
  @ApiQuery({ name: 'status', enum: ReviewStatus, required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getReviews(
    @Query('propertyId') propertyId: string,
    @Query('status') status?: ReviewStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reviewService.getReviews(
      propertyId,
      status,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Patch(':id/moderate')
  @Auth(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER, UserRole.SUPPORT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Moderate a review (Publish/Hide/Flag)' })
  moderateReview(
    @Param('id') id: string,
    @Body() dto: ModerateReviewDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.reviewService.moderateReview(id, dto, req.user.id);
  }
}
