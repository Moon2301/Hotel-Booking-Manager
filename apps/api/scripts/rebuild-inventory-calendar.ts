/**
 * Sync inventory_calendar.sold / .held from bookings and active holds.
 * Run after migration 1778655000000 or when calendar drifts.
 *
 * Usage: pnpm exec ts-node scripts/rebuild-inventory-calendar.ts
 */
import { AppDataSource } from '../src/database/data-source';
import { InventoryService } from '../src/modules/channel/inventory/inventory.service';
import { InventoryCalendar } from '../src/modules/channel/entities/inventory-calendar.entity';
import { Room } from '../src/modules/property/entities/room.entity';
import { RoomType } from '../src/modules/property/entities/room-type.entity';
import { Booking } from '../src/modules/booking/entities/booking.entity';
import { BookingHold } from '../src/modules/booking/entities/booking-hold.entity';

async function main() {
  await AppDataSource.initialize();

  const inventory = new InventoryService(
    AppDataSource.getRepository(InventoryCalendar),
    AppDataSource.getRepository(Room),
    AppDataSource.getRepository(RoomType),
    AppDataSource.getRepository(Booking),
    AppDataSource.getRepository(BookingHold),
  );

  await inventory.rebuildAll();
  await AppDataSource.destroy();
  console.log('rebuild-inventory-calendar: done');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
