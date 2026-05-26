import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddServiceCatalogAndCharges1778652000000
  implements MigrationInterface
{
  name = 'AddServiceCatalogAndCharges1778652000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."invoices_type_enum" AS ENUM('DEPOSIT', 'FINAL');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "invoices"
      ADD COLUMN IF NOT EXISTS "invoice_type" "public"."invoices_type_enum" NOT NULL DEFAULT 'DEPOSIT'
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "service_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "property_id" uuid NOT NULL,
        "name" character varying NOT NULL,
        "category" character varying NOT NULL DEFAULT 'OTHER',
        "unit" character varying NOT NULL DEFAULT 'lần',
        "unit_price" numeric(12,2) NOT NULL,
        "currency" character(3) NOT NULL DEFAULT 'VND',
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_service_items" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_service_items_property') THEN
          ALTER TABLE "service_items"
            ADD CONSTRAINT "FK_service_items_property"
            FOREIGN KEY ("property_id") REFERENCES "properties"("id")
            ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_service_items_property"
      ON "service_items" ("property_id")
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."booking_charges_status_enum" AS ENUM('POSTED', 'VOID');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "booking_charges" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "booking_id" uuid NOT NULL,
        "room_id" uuid,
        "service_item_id" uuid,
        "description" text,
        "quantity" integer NOT NULL DEFAULT 1,
        "unit_price" numeric(12,2) NOT NULL,
        "amount" numeric(12,2) NOT NULL,
        "currency" character(3) NOT NULL DEFAULT 'VND',
        "status" "public"."booking_charges_status_enum" NOT NULL DEFAULT 'POSTED',
        "created_by" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_booking_charges" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_booking_charges_booking') THEN
          ALTER TABLE "booking_charges"
            ADD CONSTRAINT "FK_booking_charges_booking"
            FOREIGN KEY ("booking_id") REFERENCES "bookings"("id")
            ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_booking_charges_room') THEN
          ALTER TABLE "booking_charges"
            ADD CONSTRAINT "FK_booking_charges_room"
            FOREIGN KEY ("room_id") REFERENCES "rooms"("id")
            ON DELETE SET NULL ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_booking_charges_service_item') THEN
          ALTER TABLE "booking_charges"
            ADD CONSTRAINT "FK_booking_charges_service_item"
            FOREIGN KEY ("service_item_id") REFERENCES "service_items"("id")
            ON DELETE SET NULL ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_booking_charges_created_by') THEN
          ALTER TABLE "booking_charges"
            ADD CONSTRAINT "FK_booking_charges_created_by"
            FOREIGN KEY ("created_by") REFERENCES "users"("id")
            ON DELETE SET NULL ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_booking_charges_booking"
      ON "booking_charges" ("booking_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_booking_charges_booking"`);
    await queryRunner.query(
      `ALTER TABLE "booking_charges" DROP CONSTRAINT IF EXISTS "FK_booking_charges_created_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking_charges" DROP CONSTRAINT IF EXISTS "FK_booking_charges_service_item"`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking_charges" DROP CONSTRAINT IF EXISTS "FK_booking_charges_room"`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking_charges" DROP CONSTRAINT IF EXISTS "FK_booking_charges_booking"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "booking_charges"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."booking_charges_status_enum"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_service_items_property"`);
    await queryRunner.query(
      `ALTER TABLE "service_items" DROP CONSTRAINT IF EXISTS "FK_service_items_property"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "service_items"`);

    await queryRunner.query(
      `ALTER TABLE "invoices" DROP COLUMN IF EXISTS "invoice_type"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."invoices_type_enum"`);
  }
}

