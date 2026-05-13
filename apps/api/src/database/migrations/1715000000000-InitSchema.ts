import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1715000000000 implements MigrationInterface {
  name = 'InitSchema1715000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── Auth ──────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE "user_role_enum" AS ENUM (
        'SUPER_ADMIN',
        'PROPERTY_MANAGER',
        'FRONT_DESK',
        'HOUSEKEEPING',
        'FINANCE_READ',
        'SUPPORT'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id"             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "email"          VARCHAR(255) NOT NULL UNIQUE,
        "password_hash"  VARCHAR(255) NOT NULL,
        "role"           "user_role_enum" NOT NULL DEFAULT 'SUPPORT',
        "token_version"  INTEGER NOT NULL DEFAULT 0,
        "locked_at"      TIMESTAMPTZ,
        "created_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "refresh_tokens" (
        "id"           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id"      UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "token_hash"   VARCHAR(255) NOT NULL,
        "expires_at"   TIMESTAMPTZ NOT NULL,
        "revoked_at"   TIMESTAMPTZ,
        "created_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_refresh_tokens_user_id" ON "refresh_tokens"("user_id")`);

    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id"          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "actor_id"    UUID,
        "action"      VARCHAR(100) NOT NULL,
        "entity_type" VARCHAR(100) NOT NULL,
        "entity_id"   VARCHAR(255),
        "before"      JSONB,
        "after"       JSONB,
        "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_audit_logs_actor_id" ON "audit_logs"("actor_id")`);
    await queryRunner.query(`CREATE INDEX "idx_audit_logs_entity" ON "audit_logs"("entity_type", "entity_id")`);

    // ─── Property & Inventory ───────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "properties" (
        "id"            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name"          VARCHAR(255) NOT NULL,
        "iana_timezone" VARCHAR(100) NOT NULL DEFAULT 'UTC',
        "address"       TEXT,
        "phone"         VARCHAR(50),
        "email"         VARCHAR(255),
        "hold_ttl_seconds" INTEGER NOT NULL DEFAULT 600,
        "created_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "room_types" (
        "id"             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "property_id"    UUID NOT NULL REFERENCES "properties"("id") ON DELETE CASCADE,
        "name"           VARCHAR(100) NOT NULL,
        "max_occupancy"  INTEGER NOT NULL DEFAULT 2,
        "amenities"      JSONB NOT NULL DEFAULT '[]',
        "description"    TEXT,
        "created_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_room_types_property_id" ON "room_types"("property_id")`);

    await queryRunner.query(`
      CREATE TYPE "room_status_enum" AS ENUM (
        'AVAILABLE',
        'RESERVED',
        'OCCUPIED',
        'CLEANING',
        'MAINTENANCE'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "rooms" (
        "id"           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "property_id"  UUID NOT NULL REFERENCES "properties"("id") ON DELETE CASCADE,
        "room_type_id" UUID NOT NULL REFERENCES "room_types"("id"),
        "room_number"  VARCHAR(20) NOT NULL,
        "status"       "room_status_enum" NOT NULL DEFAULT 'AVAILABLE',
        "floor"        INTEGER,
        "notes"        TEXT,
        "created_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE("property_id", "room_number")
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_rooms_property_id" ON "rooms"("property_id")`);
    await queryRunner.query(`CREATE INDEX "idx_rooms_room_type_id" ON "rooms"("room_type_id")`);
    await queryRunner.query(`CREATE INDEX "idx_rooms_status" ON "rooms"("status")`);

    // ─── Pricing ───────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "rate_plans" (
        "id"          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "property_id" UUID NOT NULL REFERENCES "properties"("id") ON DELETE CASCADE,
        "code"        VARCHAR(50) NOT NULL,
        "name"        VARCHAR(255),
        "currency"    CHAR(3) NOT NULL DEFAULT 'VND',
        "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE("property_id", "code")
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "rate_source_enum" AS ENUM ('MANUAL', 'RULE', 'IMPORT')
    `);

    await queryRunner.query(`
      CREATE TABLE "daily_rate" (
        "id"                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "property_id"        UUID NOT NULL REFERENCES "properties"("id") ON DELETE CASCADE,
        "room_type_id"       UUID NOT NULL REFERENCES "room_types"("id") ON DELETE CASCADE,
        "rate_plan_id"       UUID REFERENCES "rate_plans"("id"),
        "night"              DATE NOT NULL,
        "amount"             NUMERIC(12, 2) NOT NULL,
        "currency"           CHAR(3) NOT NULL DEFAULT 'VND',
        "tax_included"       BOOLEAN NOT NULL DEFAULT TRUE,
        "min_stay"           INTEGER NOT NULL DEFAULT 1,
        "closed_to_arrival"  BOOLEAN NOT NULL DEFAULT FALSE,
        "rate_source"        "rate_source_enum" NOT NULL DEFAULT 'MANUAL',
        "created_at"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE("property_id", "room_type_id", "night", "rate_plan_id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_daily_rate_lookup" ON "daily_rate"("property_id", "room_type_id", "night")`);

    // ─── Booking ───────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "cancellation_policies" (
        "id"                                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "property_id"                           UUID NOT NULL REFERENCES "properties"("id") ON DELETE CASCADE,
        "free_cancel_until_hours_before_checkin" INTEGER NOT NULL DEFAULT 24,
        "fee_rule_ref"                          JSONB,
        "no_show_rule"                          JSONB,
        "policy_version"                        INTEGER NOT NULL DEFAULT 1,
        "is_active"                             BOOLEAN NOT NULL DEFAULT TRUE,
        "created_at"                            TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "booking_status_enum" AS ENUM (
        'HOLD',
        'CONFIRMED',
        'CHECKED_IN',
        'CHECKED_OUT',
        'CANCELLED',
        'NO_SHOW'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "payment_status_enum" AS ENUM (
        'PENDING',
        'AUTHORISED',
        'PAID',
        'REFUNDED',
        'FAILED'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "bookings" (
        "id"               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "property_id"      UUID NOT NULL REFERENCES "properties"("id"),
        "room_id"          UUID REFERENCES "rooms"("id"),
        "room_type_id"     UUID NOT NULL REFERENCES "room_types"("id"),
        "guest_id"         UUID NOT NULL REFERENCES "users"("id"),
        "status"           "booking_status_enum" NOT NULL DEFAULT 'HOLD',
        "check_in"         DATE NOT NULL,
        "check_out"        DATE NOT NULL,
        "policy_snapshot"  JSONB,
        "payment_status"   "payment_status_enum" NOT NULL DEFAULT 'PENDING',
        "total_amount"     NUMERIC(12, 2),
        "currency"         CHAR(3) NOT NULL DEFAULT 'VND',
        "notes"            TEXT,
        "created_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "chk_bookings_dates" CHECK ("check_out" > "check_in")
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_bookings_property_id" ON "bookings"("property_id")`);
    await queryRunner.query(`CREATE INDEX "idx_bookings_guest_id" ON "bookings"("guest_id")`);
    await queryRunner.query(`CREATE INDEX "idx_bookings_status" ON "bookings"("status")`);
    await queryRunner.query(`CREATE INDEX "idx_bookings_dates" ON "bookings"("check_in", "check_out")`);

    await queryRunner.query(`
      CREATE TABLE "booking_holds" (
        "id"           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "booking_id"   UUID REFERENCES "bookings"("id") ON DELETE CASCADE,
        "room_type_id" UUID NOT NULL REFERENCES "room_types"("id"),
        "property_id"  UUID NOT NULL REFERENCES "properties"("id"),
        "nights"       DATE[] NOT NULL,
        "expires_at"   TIMESTAMPTZ NOT NULL,
        "released_at"  TIMESTAMPTZ,
        "created_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_booking_holds_expires_at" ON "booking_holds"("expires_at") WHERE "released_at" IS NULL`);

    await queryRunner.query(`
      CREATE TABLE "booking_line_items" (
        "id"             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "booking_id"     UUID NOT NULL REFERENCES "bookings"("id") ON DELETE CASCADE,
        "night"          DATE NOT NULL,
        "unit_price"     NUMERIC(12, 2) NOT NULL,
        "tax_breakdown"  JSONB,
        "rate_plan_code" VARCHAR(50),
        "currency"       CHAR(3) NOT NULL DEFAULT 'VND',
        "created_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_booking_line_items_booking_id" ON "booking_line_items"("booking_id")`);

    await queryRunner.query(`
      CREATE TABLE "idempotency_keys" (
        "key"           VARCHAR(255) NOT NULL,
        "user_id"       UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "request_hash"  VARCHAR(255) NOT NULL,
        "response_json" JSONB,
        "created_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY ("key", "user_id")
      )
    `);

    // ─── Payments ──────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE "payment_outcome_enum" AS ENUM ('SUCCESS', 'FAILED', 'REFUNDED', 'DISPUTED')
    `);

    await queryRunner.query(`
      CREATE TABLE "payment_events" (
        "id"           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "event_id"     TEXT NOT NULL UNIQUE,
        "provider"     VARCHAR(50) NOT NULL,
        "payload_hash" VARCHAR(255) NOT NULL,
        "processed_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "outcome"      "payment_outcome_enum" NOT NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "payment_transactions" (
        "id"           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "booking_id"   UUID NOT NULL REFERENCES "bookings"("id"),
        "provider_ref" VARCHAR(255),
        "amount"       NUMERIC(12, 2) NOT NULL,
        "currency"     CHAR(3) NOT NULL DEFAULT 'VND',
        "status"       "payment_status_enum" NOT NULL DEFAULT 'PENDING',
        "event_id"     TEXT REFERENCES "payment_events"("event_id"),
        "created_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_payment_transactions_booking_id" ON "payment_transactions"("booking_id")`);
    await queryRunner.query(`CREATE INDEX "idx_payment_transactions_provider_ref" ON "payment_transactions"("provider_ref")`);

    // ─── Reviews ───────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE "review_status_enum" AS ENUM ('PUBLISHED', 'HIDDEN', 'FLAGGED')
    `);

    await queryRunner.query(`
      CREATE TABLE "reviews" (
        "id"              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "booking_id"      UUID NOT NULL REFERENCES "bookings"("id"),
        "guest_id"        UUID NOT NULL REFERENCES "users"("id"),
        "property_id"     UUID NOT NULL REFERENCES "properties"("id"),
        "rating"          SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
        "content"         TEXT,
        "content_hash"    VARCHAR(255),
        "device_fingerprint" VARCHAR(255),
        "status"          "review_status_enum" NOT NULL DEFAULT 'PUBLISHED',
        "flagged_reason"  TEXT,
        "hidden_reason"   TEXT,
        "moderated_by"    UUID REFERENCES "users"("id"),
        "moderated_at"    TIMESTAMPTZ,
        "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_reviews_property_id" ON "reviews"("property_id")`);
    await queryRunner.query(`CREATE INDEX "idx_reviews_status" ON "reviews"("status")`);

    // ─── Notifications ─────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "device_tokens" (
        "id"          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id"     UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "device_id"   VARCHAR(255) NOT NULL,
        "expo_token"  VARCHAR(255) NOT NULL,
        "platform"    VARCHAR(20) NOT NULL DEFAULT 'ios',
        "revoked_at"  TIMESTAMPTZ,
        "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE("user_id", "device_id")
      )
    `);

    // ─── Chat ──────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE "chat_thread_status_enum" AS ENUM ('OPEN', 'RESOLVED', 'CLOSED')
    `);

    await queryRunner.query(`
      CREATE TABLE "chat_threads" (
        "id"          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "property_id" UUID NOT NULL REFERENCES "properties"("id"),
        "booking_id"  UUID REFERENCES "bookings"("id"),
        "guest_id"    UUID NOT NULL REFERENCES "users"("id"),
        "status"      "chat_thread_status_enum" NOT NULL DEFAULT 'OPEN',
        "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_chat_threads_property_id" ON "chat_threads"("property_id")`);

    await queryRunner.query(`
      CREATE TABLE "chat_messages" (
        "id"          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "thread_id"   UUID NOT NULL REFERENCES "chat_threads"("id") ON DELETE CASCADE,
        "sender_id"   UUID NOT NULL REFERENCES "users"("id"),
        "sender_role" VARCHAR(50) NOT NULL,
        "content"     TEXT NOT NULL,
        "sent_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_chat_messages_thread_id" ON "chat_messages"("thread_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "chat_messages" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "chat_threads" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "chat_thread_status_enum"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "device_tokens" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "reviews" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "review_status_enum"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payment_transactions" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payment_events" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "payment_outcome_enum"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "idempotency_keys" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "booking_line_items" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "booking_holds" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "bookings" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "payment_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "booking_status_enum"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cancellation_policies" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "daily_rate" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "rate_source_enum"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "rate_plans" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "rooms" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "room_status_enum"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "room_types" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "properties" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "refresh_tokens" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "user_role_enum"`);
  }
}
