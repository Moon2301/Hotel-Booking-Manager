import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Review } from './entities/review.entity';
import { AuditLog } from '../auth/entities/audit-log.entity';
import { ReviewService } from './review.service';
import { ReviewController } from './review.controller';
import { PublicReviewController } from './public-review.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Review, AuditLog])],
  controllers: [ReviewController, PublicReviewController],
  providers: [ReviewService],
  exports: [ReviewService],
})
export class ReviewModule {}
