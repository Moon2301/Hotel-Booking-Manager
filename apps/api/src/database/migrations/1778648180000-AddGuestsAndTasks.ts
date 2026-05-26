import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGuestsAndTasks1778648180000 implements MigrationInterface {
  name = 'AddGuestsAndTasks1778648180000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "guests" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "full_name" character varying NOT NULL,
        "email" character varying NOT NULL,
        "phone" character varying NOT NULL,
        "cccd_hash" character varying,
        "id_document_type" character varying,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_guests" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "guests"
      ADD COLUMN IF NOT EXISTS "id_document_type" character varying
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."tasks_type_enum" AS ENUM('CLEANING', 'FOOD', 'TRANSPORT', 'OTHER');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."tasks_status_enum" AS ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tasks" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "booking_id" uuid NOT NULL,
        "type" "public"."tasks_type_enum" NOT NULL,
        "status" "public"."tasks_status_enum" NOT NULL DEFAULT 'PENDING',
        "assigned_to" uuid,
        "guest_note" text,
        "staff_report" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tasks" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_tasks_booking'
        ) THEN
          ALTER TABLE "tasks"
            ADD CONSTRAINT "FK_tasks_booking"
            FOREIGN KEY ("booking_id") REFERENCES "bookings"("id")
            ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_tasks_assignee'
        ) THEN
          ALTER TABLE "tasks"
            ADD CONSTRAINT "FK_tasks_assignee"
            FOREIGN KEY ("assigned_to") REFERENCES "users"("id")
            ON DELETE SET NULL ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT IF EXISTS "FK_tasks_assignee"`);
    await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT IF EXISTS "FK_tasks_booking"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tasks"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."tasks_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."tasks_type_enum"`);
    await queryRunner.query(`ALTER TABLE "guests" DROP COLUMN IF EXISTS "id_document_type"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "guests"`);
  }
}
