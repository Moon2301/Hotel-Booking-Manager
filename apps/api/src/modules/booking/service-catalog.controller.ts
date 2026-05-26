import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Auth } from '../auth/guards/jwt-auth.guard';
import { UserRole } from '../auth/entities/user.entity';
import { ServiceItem } from './entities/service-item.entity';
import { CreateServiceItemDto, UpdateServiceItemDto } from './dto/service-item.dto';

@ApiTags('Service Catalog')
@Controller('properties/:propertyId/service-items')
export class ServiceCatalogController {
  constructor(
    @InjectRepository(ServiceItem)
    private readonly repo: Repository<ServiceItem>,
  ) {}

  @Get()
  @Auth(
    UserRole.SUPER_ADMIN,
    UserRole.PROPERTY_MANAGER,
    UserRole.FRONT_DESK,
    UserRole.SUPPORT,
    UserRole.HOUSEKEEPING,
  )
  @ApiBearerAuth()
  @ApiQuery({ name: 'all', required: false, description: 'Include inactive items' })
  @ApiOperation({ summary: 'List service catalog items for a property' })
  list(
    @Param('propertyId') propertyId: string,
    @Query('all') all?: string,
  ) {
    const includeAll = all === 'true' || all === '1';
    return this.repo.find({
      where: includeAll ? { propertyId } : { propertyId, isActive: true },
      order: { category: 'ASC', name: 'ASC' },
    });
  }

  @Post()
  @Auth(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a service catalog item (price list)' })
  async create(
    @Param('propertyId') propertyId: string,
    @Body() body: CreateServiceItemDto,
  ) {
    const item = this.repo.create({
      propertyId,
      name: body.name.trim(),
      category: body.category || 'OTHER',
      unit: body.unit || 'lần',
      unitPrice: body.unitPrice,
      currency: body.currency || 'VND',
      isActive: body.isActive ?? true,
    });
    return this.repo.save(item);
  }

  @Patch(':id')
  @Auth(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a service catalog item' })
  async update(
    @Param('propertyId') propertyId: string,
    @Param('id') id: string,
    @Body() body: UpdateServiceItemDto,
  ) {
    const item = await this.repo.findOne({ where: { id, propertyId } });
    if (!item) throw new NotFoundException('Service item not found');

    if (body.name != null) item.name = body.name.trim();
    if (body.category != null) item.category = body.category;
    if (body.unit != null) item.unit = body.unit;
    if (body.unitPrice != null) item.unitPrice = body.unitPrice;
    if (body.currency != null) item.currency = body.currency;
    if (body.isActive != null) item.isActive = body.isActive;

    return this.repo.save(item);
  }
}
