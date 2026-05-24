import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReconciliationTickets1778648170000 implements MigrationInterface {
  name = 'AddReconciliationTickets1778648170000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "reconciliation_tickets" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "invoice_id" uuid NOT NULL,
        "transaction_date" date NOT NULL,
        "system_amount" numeric(12,2) NOT NULL,
        "gateway_amount" numeric(12,2),
        "status" character varying NOT NULL DEFAULT 'UNRESOLVED',
        "notes" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_reconciliation_tickets" PRIMARY KEY ("id")
      )
    `);
    
    await queryRunner.query(`
      ALTER TABLE "reconciliation_tickets"
      ADD CONSTRAINT "FK_reconciliation_invoice" FOREIGN KEY ("invoice_id")
      REFERENCES "invoices"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "reconciliation_tickets" DROP CONSTRAINT "FK_reconciliation_invoice"`);
    await queryRunner.query(`DROP TABLE "reconciliation_tickets"`);
  }
}
