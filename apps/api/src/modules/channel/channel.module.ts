import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryCalendar } from './entities/inventory-calendar.entity';
import { InventoryService } from './inventory/inventory.service';
import { Room } from '../property/entities/room.entity';
import { RoomType } from '../property/entities/room-type.entity';
import { Booking } from '../booking/entities/booking.entity';
import { BookingHold } from '../booking/entities/booking-hold.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InventoryCalendar,
      Room,
      RoomType,
      Booking,
      BookingHold,
    ]),
  ],
  providers: [InventoryService],
  exports: [InventoryService, TypeOrmModule],
})
export class ChannelModule {}
