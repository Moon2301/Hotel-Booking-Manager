import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Baseline linked bookings.guest_id → users.id; app uses guests table.
 */
export class FixBookingGuestForeignKey1778653000000
  implements MigrationInterface
{
  name = 'FixBookingGuestForeignKey1778653000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "bookings"
      DROP CONSTRAINT IF EXISTS "FK_b4403309538387262d97fdf2462"
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_bookings_guest'
        ) THEN
          ALTER TABLE "bookings"
            ADD CONSTRAINT "FK_bookings_guest"
            FOREIGN KEY ("guest_id") REFERENCES "guests"("id")
            ON DELETE NO ACTION ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "reviews"
      DROP CONSTRAINT IF EXISTS "FK_99e07efa0e6f03c2215a193ae85"
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_reviews_guest'
        ) THEN
          ALTER TABLE "reviews"
            ADD CONSTRAINT "FK_reviews_guest"
            FOREIGN KEY ("guest_id") REFERENCES "guests"("id")
            ON DELETE NO ACTION ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "chat_threads"
      DROP CONSTRAINT IF EXISTS "FK_78ebea3f4b3748431380ad4d3c9"
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_chat_threads_guest'
        ) THEN
          ALTER TABLE "chat_threads"
            ADD CONSTRAINT "FK_chat_threads_guest"
            FOREIGN KEY ("guest_id") REFERENCES "guests"("id")
            ON DELETE NO ACTION ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "chat_threads" DROP CONSTRAINT IF EXISTS "FK_chat_threads_guest"
    `);
    await queryRunner.query(`
      ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "FK_reviews_guest"
    `);
    await queryRunner.query(`
      ALTER TABLE "bookings" DROP CONSTRAINT IF EXISTS "FK_bookings_guest"
    `);
  }
}
