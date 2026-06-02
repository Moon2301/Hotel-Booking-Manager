import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReferralPartners1778657000000 implements MigrationInterface {
  name = 'AddReferralPartners1778657000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "referral_partners" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(120) NOT NULL,
        "code" character varying(32) NOT NULL,
        "commission_rate_percent" numeric(5,2) NOT NULL DEFAULT 5,
        "contact_email" character varying(255),
        "contact_phone" character varying(32),
        "notes" text,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_referral_partners" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_referral_partners_code" UNIQUE ("code")
      )
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."partner_commissions_status_enum" AS ENUM(
          'ACCRUED', 'PAID_OUT', 'CANCELLED'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "partner_commissions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "partner_id" uuid NOT NULL,
        "booking_id" uuid NOT NULL,
        "booking_amount" numeric(12,2) NOT NULL,
        "commission_rate_percent" numeric(5,2) NOT NULL,
        "commission_amount" numeric(12,2) NOT NULL,
        "status" "public"."partner_commissions_status_enum" NOT NULL DEFAULT 'ACCRUED',
        "paid_out_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_partner_commissions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_partner_commissions_booking" UNIQUE ("booking_id")
      )
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_partner_commissions_partner') THEN
          ALTER TABLE "partner_commissions"
            ADD CONSTRAINT "FK_partner_commissions_partner"
            FOREIGN KEY ("partner_id") REFERENCES "referral_partners"("id")
            ON DELETE RESTRICT ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_partner_commissions_booking') THEN
          ALTER TABLE "partner_commissions"
            ADD CONSTRAINT "FK_partner_commissions_booking"
            FOREIGN KEY ("booking_id") REFERENCES "bookings"("id")
            ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_partner_commissions_partner"
      ON "partner_commissions" ("partner_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "bookings"
      ADD COLUMN IF NOT EXISTS "partner_id" uuid
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_bookings_partner') THEN
          ALTER TABLE "bookings"
            ADD CONSTRAINT "FK_bookings_partner"
            FOREIGN KEY ("partner_id") REFERENCES "referral_partners"("id")
            ON DELETE SET NULL ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "bookings" DROP CONSTRAINT IF EXISTS "FK_bookings_partner"
    `);
    await queryRunner.query(`
      ALTER TABLE "bookings" DROP COLUMN IF EXISTS "partner_id"
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "partner_commissions"`);
    await queryRunner.query(`
      DROP TYPE IF EXISTS "public"."partner_commissions_status_enum"
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "referral_partners"`);
  }
}
