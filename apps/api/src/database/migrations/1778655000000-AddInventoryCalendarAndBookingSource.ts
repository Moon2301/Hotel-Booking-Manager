import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInventoryCalendarAndBookingSource1778655000000
  implements MigrationInterface
{
  name = 'AddInventoryCalendarAndBookingSource1778655000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "inventory_calendar" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "property_id" uuid NOT NULL,
        "room_type_id" uuid NOT NULL,
        "night" date NOT NULL,
        "total_allotment" integer NOT NULL DEFAULT 0,
        "sold" integer NOT NULL DEFAULT 0,
        "held" integer NOT NULL DEFAULT 0,
        "stop_sell" boolean NOT NULL DEFAULT false,
        "min_stay" integer NOT NULL DEFAULT 1,
        "closed_to_arrival" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_inventory_calendar" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_inventory_calendar_property_room_night"
          UNIQUE ("property_id", "room_type_id", "night")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_inventory_calendar_property_night"
      ON "inventory_calendar" ("property_id", "night")
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "bookings_source_enum" AS ENUM ('DIRECT', 'CHANNEL');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "bookings"
      ADD COLUMN IF NOT EXISTS "source" "bookings_source_enum" NOT NULL DEFAULT 'DIRECT'
    `);

    await queryRunner.query(`
      ALTER TABLE "bookings"
      ADD COLUMN IF NOT EXISTS "channel_code" varchar(64)
    `);

    await queryRunner.query(`
      ALTER TABLE "bookings"
      ADD COLUMN IF NOT EXISTS "external_reservation_id" varchar(128)
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_bookings_channel_external_reservation"
      ON "bookings" ("channel_code", "external_reservation_id")
      WHERE "external_reservation_id" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_bookings_channel_external_reservation"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP COLUMN IF EXISTS "external_reservation_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP COLUMN IF EXISTS "channel_code"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP COLUMN IF EXISTS "source"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "bookings_source_enum"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_inventory_calendar_property_night"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "inventory_calendar"`);
  }
}
