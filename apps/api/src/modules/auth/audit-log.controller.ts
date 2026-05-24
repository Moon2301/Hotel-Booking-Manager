import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../auth/entities/audit-log.entity';
import { Auth } from '../auth/guards/jwt-auth.guard';
import { UserRole } from '../auth/entities/user.entity';

@ApiTags('Audit Log')
@Controller('audit-logs')
export class AuditLogController {
  constructor(
    @InjectRepository(AuditLog) private auditRepo: Repository<AuditLog>,
  ) {}

  @Get()
  @Auth(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER, UserRole.FINANCE_READ)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List audit log entries with optional filters' })
  @ApiQuery({ name: 'entityType', required: false })
  @ApiQuery({ name: 'actorId', required: false })
  @ApiQuery({ name: 'entityId', required: false })
  @ApiQuery({ name: 'from', required: false, description: 'ISO date' })
  @ApiQuery({ name: 'to', required: false, description: 'ISO date' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async listAuditLogs(
    @Query('entityType') entityType?: string,
    @Query('actorId') actorId?: string,
    @Query('entityId') entityId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page) : 1;
    const limitNum = limit ? parseInt(limit) : 50;

    const qb = this.auditRepo.createQueryBuilder('log');

    if (entityType) qb.andWhere('log.entityType = :entityType', { entityType });
    if (actorId) qb.andWhere('log.actorId = :actorId', { actorId });
    if (entityId) qb.andWhere('log.entityId = :entityId', { entityId });
    if (from) qb.andWhere('log.createdAt >= :from', { from: new Date(from) });
    if (to) qb.andWhere('log.createdAt <= :to', { to: new Date(to) });

    qb.orderBy('log.createdAt', 'DESC')
      .skip((pageNum - 1) * limitNum)
      .take(limitNum);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }
}
