import { Controller, Get, Post, Body, Param, Patch, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { PropertyService } from './property.service';
import { CreatePropertyDto, CreateRoomTypeDto, CreateRoomDto, UpdateRoomStatusDto } from './dto/property.dto';
import { JwtAuthGuard, Auth } from '../auth/guards/jwt-auth.guard';
import { UserRole } from '../auth/entities/user.entity';

@ApiTags('Property & Rooms')
@Controller('properties')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PropertyController {
  constructor(private readonly propertyService: PropertyService) {}

  @Post()
  @Auth(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER)
  @ApiOperation({ summary: 'Create a new property' })
  createProperty(@Body() dto: CreatePropertyDto, @Req() req: Request & { user: { id: string } }) {
    return this.propertyService.createProperty(dto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List all properties' })
  getProperties() {
    return this.propertyService.getProperties();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get property by ID' })
  getProperty(@Param('id') id: string) {
    return this.propertyService.getProperty(id);
  }

  @Post(':id/room-types')
  @Auth(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER)
  @ApiOperation({ summary: 'Create a room type for a property' })
  createRoomType(
    @Param('id') propertyId: string,
    @Body() dto: CreateRoomTypeDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.propertyService.createRoomType(propertyId, dto, req.user.id);
  }

  @Get(':id/room-types')
  @ApiOperation({ summary: 'List room types for a property' })
  getRoomTypes(@Param('id') propertyId: string) {
    return this.propertyService.getRoomTypes(propertyId);
  }

  @Post(':id/rooms')
  @Auth(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER)
  @ApiOperation({ summary: 'Create a physical room for a property' })
  createRoom(
    @Param('id') propertyId: string,
    @Body() dto: CreateRoomDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.propertyService.createRoom(propertyId, dto, req.user.id);
  }

  @Get(':id/rooms')
  @ApiOperation({ summary: 'List all rooms for a property' })
  getRooms(@Param('id') propertyId: string) {
    return this.propertyService.getRooms(propertyId);
  }

  @Patch(':propertyId/rooms/:roomId/status')
  @Auth(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER, UserRole.FRONT_DESK, UserRole.HOUSEKEEPING)
  @ApiOperation({ summary: 'Update operational status of a room (state machine enforced)' })
  updateRoomStatus(
    @Param('propertyId') propertyId: string,
    @Param('roomId') roomId: string,
    @Body() dto: UpdateRoomStatusDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.propertyService.updateRoomStatus(propertyId, roomId, dto, req.user.id);
  }
}
