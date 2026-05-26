-- Backfill for databases created before invoices were added to baseline migration
DO $$ BEGIN
  CREATE TYPE "public"."invoices_payment_status_enum" AS ENUM(
    'PENDING', 'AUTHORISED', 'PAID', 'REFUNDED', 'FAILED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."invoices_payment_method_enum" AS ENUM('CASH', 'CARD', 'VNPAY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "invoices" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "booking_id" uuid NOT NULL,
  "total_amount" numeric(12,2) NOT NULL,
  "payment_status" "public"."invoices_payment_status_enum" NOT NULL DEFAULT 'PENDING',
  "payment_method" "public"."invoices_payment_method_enum",
  "vnpay_transaction_id" character varying,
  "issued_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "paid_at" TIMESTAMP WITH TIME ZONE,
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT "PK_invoices" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'FK_invoices_booking'
  ) THEN
    ALTER TABLE "invoices"
      ADD CONSTRAINT "FK_invoices_booking"
      FOREIGN KEY ("booking_id") REFERENCES "bookings"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END $$;

-- Guests (public booking / My Stay)
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
);

ALTER TABLE "guests" ADD COLUMN IF NOT EXISTS "id_document_type" character varying;

-- Room service tasks (guest portal)
DO $$ BEGIN
  CREATE TYPE "public"."tasks_type_enum" AS ENUM('CLEANING', 'FOOD', 'TRANSPORT', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."tasks_status_enum" AS ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

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
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_tasks_booking') THEN
    ALTER TABLE "tasks"
      ADD CONSTRAINT "FK_tasks_booking"
      FOREIGN KEY ("booking_id") REFERENCES "bookings"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END $$;

-- Check-in occupants (multiple guests per booking)
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
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_booking_occupants_booking') THEN
    ALTER TABLE "booking_occupants"
      ADD CONSTRAINT "FK_booking_occupants_booking"
      FOREIGN KEY ("booking_id") REFERENCES "bookings"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_booking_occupants_room') THEN
    ALTER TABLE "booking_occupants"
      ADD CONSTRAINT "FK_booking_occupants_room"
      FOREIGN KEY ("room_id") REFERENCES "rooms"("id")
      ON DELETE NO ACTION ON UPDATE NO ACTION;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "IDX_booking_occupants_booking"
  ON "booking_occupants" ("booking_id");
