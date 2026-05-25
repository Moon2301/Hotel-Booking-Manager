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
