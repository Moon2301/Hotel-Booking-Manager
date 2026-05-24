import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCheckinAndHoldGuard1778648160000 implements MigrationInterface {
  name = 'AddCheckinAndHoldGuard1778648160000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Booking Check-in columns
    await queryRunner.query(`ALTER TABLE "bookings" ADD "checkin_token" character varying`);
    await queryRunner.query(`ALTER TABLE "bookings" ADD CONSTRAINT "UQ_checkin_token" UNIQUE ("checkin_token")`);
    await queryRunner.query(`ALTER TABLE "bookings" ADD "checkin_pin" character varying(60)`);
    await queryRunner.query(`ALTER TABLE "bookings" ADD "checkin_token_expires_at" TIMESTAMP WITH TIME ZONE`);

    // 2. Booking Holds performance / guard indexes
    await queryRunner.query(`CREATE INDEX "idx_booking_holds_active" ON "booking_holds" ("property_id", "room_type_id") WHERE "released_at" IS NULL`);
    await queryRunner.query(`CREATE INDEX "idx_booking_holds_expires" ON "booking_holds" ("expires_at") WHERE "released_at" IS NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert Holds indexes
    await queryRunner.query(`DROP INDEX "public"."idx_booking_holds_expires"`);
    await queryRunner.query(`DROP INDEX "public"."idx_booking_holds_active"`);

    // Revert Booking Check-in columns
    await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN "checkin_token_expires_at"`);
    await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN "checkin_pin"`);
    await queryRunner.query(`ALTER TABLE "bookings" DROP CONSTRAINT "UQ_checkin_token"`);
    await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN "checkin_token"`);
  }
}
