import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Property } from './entities/property.entity';
import { RoomType } from './entities/room-type.entity';
import { Room, RoomStatus, ROOM_TRANSITIONS } from './entities/room.entity';
import {
  CreatePropertyDto,
  UpdatePropertyDto,
  CreateRoomTypeDto,
  UpdateRoomTypeDto,
  CreateRoomDto,
  UpdateRoomStatusDto,
} from './dto/property.dto';
import { AuditLog } from '../auth/entities/audit-log.entity';

@Injectable()
export class PropertyService {
  constructor(
    @InjectRepository(Property) private propertyRepo: Repository<Property>,
    @InjectRepository(RoomType) private roomTypeRepo: Repository<RoomType>,
    @InjectRepository(Room) private roomRepo: Repository<Room>,
    @InjectRepository(AuditLog) private auditRepo: Repository<AuditLog>,
  ) {}

  // ─── Property ─────────────────────────────────────────────────────────────

  async createProperty(dto: CreatePropertyDto, actorId: string): Promise<Property> {
    const property = this.propertyRepo.create(dto);
    const saved = await this.propertyRepo.save(property);

    await this.auditRepo.save({
      actorId,
      action: 'property.create',
      entityType: 'properties',
      entityId: saved.id,
      after: saved as unknown as Record<string, unknown>,
    });

    return saved;
  }

  async getProperties(): Promise<Property[]> {
    return this.propertyRepo.find({ order: { createdAt: 'DESC' } });
  }

  async getProperty(id: string): Promise<Property> {
    const property = await this.propertyRepo.findOne({ where: { id } });
    if (!property) throw new NotFoundException('Property not found');
    return property;
  }

  async updateProperty(id: string, dto: UpdatePropertyDto, actorId: string): Promise<Property> {
    const property = await this.getProperty(id);
    const before = { ...property };

    Object.assign(property, dto);
    const saved = await this.propertyRepo.save(property);

    await this.auditRepo.save({
      actorId,
      action: 'property.update',
      entityType: 'properties',
      entityId: id,
      before: before as unknown as Record<string, unknown>,
      after: saved as unknown as Record<string, unknown>,
    });

    return saved;
  }

  // ─── Room Type ────────────────────────────────────────────────────────────

  async createRoomType(
    propertyId: string,
    dto: CreateRoomTypeDto,
    actorId: string,
  ): Promise<RoomType> {
    const property = await this.getProperty(propertyId);
    const roomType = this.roomTypeRepo.create({ ...dto, propertyId: property.id });
    const saved = await this.roomTypeRepo.save(roomType);

    await this.auditRepo.save({
      actorId,
      action: 'room_type.create',
      entityType: 'room_types',
      entityId: saved.id,
      after: saved as unknown as Record<string, unknown>,
    });

    return saved;
  }

  async getRoomTypes(propertyId: string): Promise<RoomType[]> {
    return this.roomTypeRepo.find({ where: { propertyId } });
  }

  async updateRoomType(
    propertyId: string,
    roomTypeId: string,
    dto: UpdateRoomTypeDto,
    actorId: string,
  ): Promise<RoomType> {
    await this.getProperty(propertyId);
    const roomType = await this.roomTypeRepo.findOne({
      where: { id: roomTypeId, propertyId },
    });
    if (!roomType) throw new NotFoundException('RoomType not found');

    const before = { ...roomType };
    Object.assign(roomType, dto);
    const saved = await this.roomTypeRepo.save(roomType);

    await this.auditRepo.save({
      actorId,
      action: 'room_type.update',
      entityType: 'room_types',
      entityId: roomTypeId,
      before: before as unknown as Record<string, unknown>,
      after: saved as unknown as Record<string, unknown>,
    });

    return saved;
  }

  async deleteRoomType(
    propertyId: string,
    roomTypeId: string,
    actorId: string,
  ): Promise<{ success: boolean }> {
    await this.getProperty(propertyId);
    const roomType = await this.roomTypeRepo.findOne({
      where: { id: roomTypeId, propertyId },
    });
    if (!roomType) throw new NotFoundException('RoomType not found');

    await this.roomTypeRepo.remove(roomType);

    await this.auditRepo.save({
      actorId,
      action: 'room_type.delete',
      entityType: 'room_types',
      entityId: roomTypeId,
      before: roomType as unknown as Record<string, unknown>,
    });

    return { success: true };
  }

  // ─── Room ─────────────────────────────────────────────────────────────────

  async createRoom(
    propertyId: string,
    dto: CreateRoomDto,
    actorId: string,
  ): Promise<Room> {
    const roomType = await this.roomTypeRepo.findOne({
      where: { id: dto.roomTypeId, propertyId },
    });
    if (!roomType)
      throw new NotFoundException('RoomType not found for this property');

    const existing = await this.roomRepo.findOne({
      where: { propertyId, roomNumber: dto.roomNumber },
    });
    if (existing)
      throw new ConflictException('Room number already exists in this property');

    const room = this.roomRepo.create({ ...dto, propertyId });
    const saved = await this.roomRepo.save(room);

    await this.auditRepo.save({
      actorId,
      action: 'room.create',
      entityType: 'rooms',
      entityId: saved.id,
      after: saved as unknown as Record<string, unknown>,
    });

    return saved;
  }

  async getRooms(propertyId: string): Promise<Room[]> {
    return this.roomRepo.find({
      where: { propertyId },
      relations: ['roomType'],
    });
  }

  async updateRoomStatus(
    propertyId: string,
    roomId: string,
    dto: UpdateRoomStatusDto,
    actorId: string,
  ): Promise<Room> {
    const room = await this.roomRepo.findOne({ where: { id: roomId, propertyId } });
    if (!room) throw new NotFoundException('Room not found');

    const validNextStates = ROOM_TRANSITIONS[room.status];
    if (!validNextStates?.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition room status from ${room.status} to ${dto.status}`,
      );
    }

    const before = { status: room.status };
    room.status = dto.status;
    const saved = await this.roomRepo.save(room);

    await this.auditRepo.save({
      actorId,
      action: 'room.update_status',
      entityType: 'rooms',
      entityId: saved.id,
      before,
      after: { status: saved.status },
    });

    return saved;
  }

  async deleteRoom(
    propertyId: string,
    roomId: string,
    actorId: string,
  ): Promise<{ success: boolean }> {
    const room = await this.roomRepo.findOne({ where: { id: roomId, propertyId } });
    if (!room) throw new NotFoundException('Room not found');

    if (room.status === RoomStatus.OCCUPIED) {
      throw new BadRequestException('Cannot delete an occupied room');
    }

    await this.roomRepo.remove(room);

    await this.auditRepo.save({
      actorId,
      action: 'room.delete',
      entityType: 'rooms',
      entityId: roomId,
      before: room as unknown as Record<string, unknown>,
    });

    return { success: true };
  }
}
