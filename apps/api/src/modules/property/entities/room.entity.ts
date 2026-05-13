import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Unique,
} from 'typeorm';
import { Property } from './property.entity';
import { RoomType } from './room-type.entity';

export enum RoomStatus {
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  OCCUPIED = 'OCCUPIED',
  CLEANING = 'CLEANING',
  MAINTENANCE = 'MAINTENANCE',
}

/** Valid state machine transitions */
export const ROOM_TRANSITIONS: Partial<Record<RoomStatus, RoomStatus[]>> = {
  [RoomStatus.AVAILABLE]:    [RoomStatus.RESERVED, RoomStatus.MAINTENANCE],
  [RoomStatus.RESERVED]:     [RoomStatus.OCCUPIED, RoomStatus.AVAILABLE],
  [RoomStatus.OCCUPIED]:     [RoomStatus.CLEANING],
  [RoomStatus.CLEANING]:     [RoomStatus.AVAILABLE, RoomStatus.MAINTENANCE],
  [RoomStatus.MAINTENANCE]:  [RoomStatus.AVAILABLE],
};

@Entity('rooms')
@Unique(['propertyId', 'roomNumber'])
export class Room {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'property_id' }) propertyId: string;
  @ManyToOne(() => Property, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'property_id' })
  property: Property;
  @Column({ name: 'room_type_id' }) roomTypeId: string;
  @ManyToOne(() => RoomType)
  @JoinColumn({ name: 'room_type_id' })
  roomType: RoomType;
  @Column({ name: 'room_number' }) roomNumber: string;
  @Column({ type: 'enum', enum: RoomStatus, default: RoomStatus.AVAILABLE }) status: RoomStatus;
  @Column({ nullable: true }) floor: number;
  @Column({ nullable: true }) notes: string;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}
