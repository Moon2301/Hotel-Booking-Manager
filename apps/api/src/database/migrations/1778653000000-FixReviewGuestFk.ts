import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fix: Mismatch of Guest vs User FK constraints.
 * 1. reviews.guest_id -> points to guests(id) instead of users(id)
 * 2. bookings.guest_id -> points to guests(id) instead of users(id)
 * 3. chat_threads.guest_id -> points to guests(id) instead of users(id)
 * 4. chat_messages.sender_id -> drop FK constraint pointing to users(id) (since sender can be user or guest)
 */
export class FixReviewGuestFk1778653000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── 1. Fix Reviews FK ──────────────────────────────────────────────────
    // Drop incorrect FK constraint pointing to users
    await queryRunner.query(`
      ALTER TABLE "reviews"
      DROP CONSTRAINT IF EXISTS "FK_reviews_guest_id_users"
    `);

    // Drop auto-generated FK with TypeORM naming convention if present
    await queryRunner.query(`
      DO $$ DECLARE
        r RECORD;
      BEGIN
        FOR r IN
          SELECT tc.constraint_name
          FROM information_schema.table_constraints AS tc
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
          JOIN information_schema.referential_constraints AS rc
            ON tc.constraint_name = rc.constraint_name
          JOIN information_schema.constraint_column_usage AS ccu
            ON rc.unique_constraint_name = ccu.constraint_name
          WHERE tc.table_name = 'reviews'
            AND kcu.column_name = 'guest_id'
            AND ccu.table_name = 'users'
        LOOP
          EXECUTE 'ALTER TABLE reviews DROP CONSTRAINT ' || quote_ident(r.constraint_name);
        END LOOP;
      END $$;
    `);

    // Clean up any orphaned reviews
    await queryRunner.query(`
      DELETE FROM "reviews"
      WHERE "guest_id" IS NOT NULL
        AND "guest_id" NOT IN (SELECT "id" FROM "guests")
    `);

    // Add correct FK constraint pointing to guests
    await queryRunner.query(`
      ALTER TABLE "reviews"
      ADD CONSTRAINT "FK_reviews_guest_id_guests"
      FOREIGN KEY ("guest_id")
      REFERENCES "guests"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE
    `);

    // ─── 2. Fix Bookings FK ──────────────────────────────────────────────────
    // Drop incorrect FK constraint pointing to users (FK_b4403309538387262d97fdf2462)
    await queryRunner.query(`
      ALTER TABLE "bookings"
      DROP CONSTRAINT IF EXISTS "FK_b4403309538387262d97fdf2462"
    `);

    // Drop auto-generated FK with TypeORM naming convention pointing to users
    await queryRunner.query(`
      DO $$ DECLARE
        r RECORD;
      BEGIN
        FOR r IN
          SELECT tc.constraint_name
          FROM information_schema.table_constraints AS tc
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
          JOIN information_schema.referential_constraints AS rc
            ON tc.constraint_name = rc.constraint_name
          JOIN information_schema.constraint_column_usage AS ccu
            ON rc.unique_constraint_name = ccu.constraint_name
          WHERE tc.table_name = 'bookings'
            AND kcu.column_name = 'guest_id'
            AND ccu.table_name = 'users'
        LOOP
          EXECUTE 'ALTER TABLE bookings DROP CONSTRAINT ' || quote_ident(r.constraint_name);
        END LOOP;
      END $$;
    `);

    // Clean up any orphaned bookings
    await queryRunner.query(`
      DELETE FROM "bookings"
      WHERE "guest_id" IS NOT NULL
        AND "guest_id" NOT IN (SELECT "id" FROM "guests")
    `);

    // Add correct FK constraint pointing to guests
    await queryRunner.query(`
      ALTER TABLE "bookings"
      ADD CONSTRAINT "FK_bookings_guest_id_guests"
      FOREIGN KEY ("guest_id")
      REFERENCES "guests"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE
    `);

    // ─── 3. Fix Chat Threads FK ──────────────────────────────────────────────
    // Drop incorrect FK constraint pointing to users (FK_78ebea3f4b3748431380ad4d3c9)
    await queryRunner.query(`
      ALTER TABLE "chat_threads"
      DROP CONSTRAINT IF EXISTS "FK_78ebea3f4b3748431380ad4d3c9"
    `);

    // Drop auto-generated FK with TypeORM naming convention pointing to users
    await queryRunner.query(`
      DO $$ DECLARE
        r RECORD;
      BEGIN
        FOR r IN
          SELECT tc.constraint_name
          FROM information_schema.table_constraints AS tc
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
          JOIN information_schema.referential_constraints AS rc
            ON tc.constraint_name = rc.constraint_name
          JOIN information_schema.constraint_column_usage AS ccu
            ON rc.unique_constraint_name = ccu.constraint_name
          WHERE tc.table_name = 'chat_threads'
            AND kcu.column_name = 'guest_id'
            AND ccu.table_name = 'users'
        LOOP
          EXECUTE 'ALTER TABLE chat_threads DROP CONSTRAINT ' || quote_ident(r.constraint_name);
        END LOOP;
      END $$;
    `);

    // Clean up any orphaned chat threads
    await queryRunner.query(`
      DELETE FROM "chat_threads"
      WHERE "guest_id" IS NOT NULL
        AND "guest_id" NOT IN (SELECT "id" FROM "guests")
    `);

    // Add correct FK constraint pointing to guests
    await queryRunner.query(`
      ALTER TABLE "chat_threads"
      ADD CONSTRAINT "FK_chat_threads_guest_id_guests"
      FOREIGN KEY ("guest_id")
      REFERENCES "guests"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE
    `);

    // ─── 4. Fix Chat Messages FK ─────────────────────────────────────────────
    // Drop incorrect FK constraint pointing to users (FK_9e5fc47ecb06d4d7b84633b1718)
    await queryRunner.query(`
      ALTER TABLE "chat_messages"
      DROP CONSTRAINT IF EXISTS "FK_9e5fc47ecb06d4d7b84633b1718"
    `);

    // Drop auto-generated FK with TypeORM naming convention pointing to users
    await queryRunner.query(`
      DO $$ DECLARE
        r RECORD;
      BEGIN
        FOR r IN
          SELECT tc.constraint_name
          FROM information_schema.table_constraints AS tc
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
          JOIN information_schema.referential_constraints AS rc
            ON tc.constraint_name = rc.constraint_name
          JOIN information_schema.constraint_column_usage AS ccu
            ON rc.unique_constraint_name = ccu.constraint_name
          WHERE tc.table_name = 'chat_messages'
            AND kcu.column_name = 'sender_id'
            AND ccu.table_name = 'users'
        LOOP
          EXECUTE 'ALTER TABLE chat_messages DROP CONSTRAINT ' || quote_ident(r.constraint_name);
        END LOOP;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert Chat Messages FK
    await queryRunner.query(`
      ALTER TABLE "chat_messages"
      ADD CONSTRAINT "FK_chat_messages_sender_id_users"
      FOREIGN KEY ("sender_id")
      REFERENCES "users"("id")
      ON DELETE NO ACTION
      ON UPDATE NO ACTION
    `);

    // Revert Chat Threads FK
    await queryRunner.query(`
      ALTER TABLE "chat_threads"
      DROP CONSTRAINT IF EXISTS "FK_chat_threads_guest_id_guests"
    `);
    await queryRunner.query(`
      ALTER TABLE "chat_threads"
      ADD CONSTRAINT "FK_chat_threads_guest_id_users"
      FOREIGN KEY ("guest_id")
      REFERENCES "users"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE
    `);

    // Revert Bookings FK
    await queryRunner.query(`
      ALTER TABLE "bookings"
      DROP CONSTRAINT IF EXISTS "FK_bookings_guest_id_guests"
    `);
    await queryRunner.query(`
      ALTER TABLE "bookings"
      ADD CONSTRAINT "FK_bookings_guest_id_users"
      FOREIGN KEY ("guest_id")
      REFERENCES "users"("id")
      ON DELETE NO ACTION
      ON UPDATE NO ACTION
    `);

    // Revert Reviews FK
    await queryRunner.query(`
      ALTER TABLE "reviews"
      DROP CONSTRAINT IF EXISTS "FK_reviews_guest_id_guests"
    `);
    await queryRunner.query(`
      ALTER TABLE "reviews"
      ADD CONSTRAINT "FK_reviews_guest_id_users"
      FOREIGN KEY ("guest_id")
      REFERENCES "users"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE
    `);
  }
}
