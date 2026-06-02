/**
 * One-off / dev: assign booking_code for rows that are still null.
 * Usage: pnpm exec ts-node scripts/backfill-booking-codes.ts
 */
import { IsNull } from 'typeorm';
import { AppDataSource } from '../src/database/data-source';
import { Booking } from '../src/modules/booking/entities/booking.entity';
import { generateBookingCode } from '../src/modules/booking/booking-code.util';

async function main() {
  await AppDataSource.initialize();
  const repo = AppDataSource.getRepository(Booking);
  const rows = await repo.find({
    where: { bookingCode: IsNull() },
    select: ['id'],
  });

  let updated = 0;
  for (const { id } of rows) {
    for (let attempt = 0; attempt < 25; attempt++) {
      const code = generateBookingCode();
      if (!(await repo.exist({ where: { bookingCode: code } }))) {
        await repo.update(id, { bookingCode: code });
        updated++;
        break;
      }
    }
  }

  console.log(`backfill-booking-codes: ${updated}/${rows.length} updated`);
  await AppDataSource.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
