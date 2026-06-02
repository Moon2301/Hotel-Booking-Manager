import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { Property } from '../../property/entities/property.entity';
import { RoomType } from '../../property/entities/room-type.entity';

@Entity('inventory_calendar')
@Unique(['propertyId', 'roomTypeId', 'night'])
export class InventoryCalendar {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'property_id' })
  propertyId: string;

  @ManyToOne(() => Property, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'property_id' })
  property: Property;

  @Column({ name: 'room_type_id' })
  roomTypeId: string;

  @ManyToOne(() => RoomType, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'room_type_id' })
  roomType: RoomType;

  @Column({ type: 'date' })
  night: string;

  /** Physical rooms of this type (cap for sale) */
  @Column({ name: 'total_allotment', type: 'int', default: 0 })
  totalAllotment: number;

  @Column({ type: 'int', default: 0 })
  sold: number;

  @Column({ type: 'int', default: 0 })
  held: number;

  @Column({ name: 'stop_sell', default: false })
  stopSell: boolean;

  @Column({ name: 'min_stay', type: 'int', default: 1 })
  minStay: number;

  @Column({ name: 'closed_to_arrival', default: false })
  closedToArrival: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
