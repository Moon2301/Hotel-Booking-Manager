import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { Review, ReviewStatus } from './entities/review.entity';
import { CreateReviewDto, ModerateReviewDto } from './dto/review.dto';
import { AuditLog } from '../auth/entities/audit-log.entity';

@Injectable()
export class ReviewService {
  constructor(
    @InjectRepository(Review) private reviewRepo: Repository<Review>,
    @InjectRepository(AuditLog) private auditRepo: Repository<AuditLog>,
  ) {}

  async createReview(dto: CreateReviewDto, guestId: string) {
    const existing = await this.reviewRepo.findOne({ where: { bookingId: dto.bookingId } });
    if (existing) throw new BadRequestException('Review already exists for this booking');

    let status = ReviewStatus.PUBLISHED;
    let flaggedReason: string | null = null;
    let contentHash: string | null = null;

    const content = dto.content;
    if (content) {
      contentHash = crypto.createHash('sha256').update(content).digest('hex');
      
      // Auto-flag logic (mock)
      const badWords = ['spam', 'fake', 'scam'];
      const hasBadWords = badWords.some(w => content.toLowerCase().includes(w));
      if (hasBadWords) {
        status = ReviewStatus.FLAGGED;
        flaggedReason = 'Contains flagged keywords';
      } else if (dto.rating === 1 && content.length < 20) {
        status = ReviewStatus.FLAGGED;
        flaggedReason = 'Extreme rating with very short content';
      }
    }

    const review = this.reviewRepo.create({
      ...dto,
      guestId,
      contentHash,
      status,
      flaggedReason,
    } as any);

    return this.reviewRepo.save(review);
  }

  async getReviews(propertyId: string, status?: ReviewStatus, page = 1, limit = 20) {
    const qb = this.reviewRepo.createQueryBuilder('review');
    if (propertyId) qb.andWhere('review.propertyId = :propertyId', { propertyId });
    if (status) qb.andWhere('review.status = :status', { status });

    qb.orderBy('review.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async moderateReview(id: string, dto: ModerateReviewDto, actorId: string) {
    const review = await this.reviewRepo.findOne({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');

    if (dto.status === ReviewStatus.HIDDEN && !dto.reason) {
      throw new BadRequestException('Reason is required when hiding a review');
    }

    const before = { status: review.status };
    
    review.status = dto.status;
    review.moderatedBy = actorId;
    review.moderatedAt = new Date();
    
    if (dto.status === ReviewStatus.HIDDEN) {
      review.hiddenReason = (dto.reason || null) as any;
    } else if (dto.status === ReviewStatus.FLAGGED) {
      review.flaggedReason = (dto.reason || null) as any;
    }

    const saved = await this.reviewRepo.save(review);

    await this.auditRepo.save({
      actorId,
      action: 'review.moderate',
      entityType: 'reviews',
      entityId: saved.id,
      before,
      after: { status: saved.status, reason: dto.reason },
    });

    return saved;
  }
}
