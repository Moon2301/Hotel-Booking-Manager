import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBookingCode1778654000000 implements MigrationInterface {
  name = 'AddBookingCode1778654000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "bookings"
      ADD COLUMN IF NOT EXISTS "booking_code" char(6)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_bookings_booking_code"
      ON "bookings" ("booking_code")
      WHERE "booking_code" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_bookings_booking_code"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP COLUMN IF EXISTS "booking_code"`,
    );
  }
}
