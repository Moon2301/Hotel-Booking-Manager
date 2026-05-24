import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { PropertyService } from './property.service';
import {
  CreatePropertyDto,
  UpdatePropertyDto,
  CreateRoomTypeDto,
  UpdateRoomTypeDto,
  CreateRoomDto,
  UpdateRoomStatusDto,
} from './dto/property.dto';
import { Auth, JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserRole } from '../auth/entities/user.entity';

@ApiTags('Property & Rooms')
@Controller('properties')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PropertyController {
  constructor(private readonly propertyService: PropertyService) {}

  // ─── Property ─────────────────────────────────────────────────────────────

  @Post()
  @Auth(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER)
  @ApiOperation({ summary: 'Create a new property' })
  createProperty(
    @Body() dto: CreatePropertyDto,
    @Req() req: Request & { user: { id: string } },
  ) {
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

  @Patch(':id')
  @Auth(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER)
  @ApiOperation({ summary: 'Update property details' })
  updateProperty(
    @Param('id') id: string,
    @Body() dto: UpdatePropertyDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.propertyService.updateProperty(id, dto, req.user.id);
  }

  // ─── Room Types ────────────────────────────────────────────────────────────

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

  @Patch(':id/room-types/:roomTypeId')
  @Auth(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER)
  @ApiOperation({ summary: 'Update a room type' })
  updateRoomType(
    @Param('id') propertyId: string,
    @Param('roomTypeId') roomTypeId: string,
    @Body() dto: UpdateRoomTypeDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.propertyService.updateRoomType(propertyId, roomTypeId, dto, req.user.id);
  }

  @Delete(':id/room-types/:roomTypeId')
  @Auth(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a room type' })
  deleteRoomType(
    @Param('id') propertyId: string,
    @Param('roomTypeId') roomTypeId: string,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.propertyService.deleteRoomType(propertyId, roomTypeId, req.user.id);
  }

  // ─── Rooms ────────────────────────────────────────────────────────────────

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
  @Auth(
    UserRole.SUPER_ADMIN,
    UserRole.PROPERTY_MANAGER,
    UserRole.FRONT_DESK,
    UserRole.HOUSEKEEPING,
  )
  @ApiOperation({ summary: 'Update operational status of a room (state machine enforced)' })
  updateRoomStatus(
    @Param('propertyId') propertyId: string,
    @Param('roomId') roomId: string,
    @Body() dto: UpdateRoomStatusDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.propertyService.updateRoomStatus(propertyId, roomId, dto, req.user.id);
  }

  @Delete(':propertyId/rooms/:roomId')
  @Auth(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a physical room (cannot delete occupied rooms)' })
  deleteRoom(
    @Param('propertyId') propertyId: string,
    @Param('roomId') roomId: string,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.propertyService.deleteRoom(propertyId, roomId, req.user.id);
  }
}
