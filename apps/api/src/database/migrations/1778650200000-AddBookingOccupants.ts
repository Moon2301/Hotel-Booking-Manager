import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBookingOccupants1778650200000 implements MigrationInterface {
  name = 'AddBookingOccupants1778650200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "booking_occupants" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "booking_id" uuid NOT NULL,
        "room_id" uuid NOT NULL,
        "full_name" character varying NOT NULL,
        "id_document_type" character varying NOT NULL,
        "id_document_hash" character varying NOT NULL,
        "is_primary" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_booking_occupants" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_booking_occupants_booking'
        ) THEN
          ALTER TABLE "booking_occupants"
            ADD CONSTRAINT "FK_booking_occupants_booking"
            FOREIGN KEY ("booking_id") REFERENCES "bookings"("id")
            ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_booking_occupants_room'
        ) THEN
          ALTER TABLE "booking_occupants"
            ADD CONSTRAINT "FK_booking_occupants_room"
            FOREIGN KEY ("room_id") REFERENCES "rooms"("id")
            ON DELETE NO ACTION ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_booking_occupants_booking"
      ON "booking_occupants" ("booking_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_booking_occupants_booking"`);
    await queryRunner.query(
      `ALTER TABLE "booking_occupants" DROP CONSTRAINT IF EXISTS "FK_booking_occupants_room"`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking_occupants" DROP CONSTRAINT IF EXISTS "FK_booking_occupants_booking"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "booking_occupants"`);
  }
}
