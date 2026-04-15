import { MigrationInterface, QueryRunner } from 'typeorm';

export class BudgetSchemaExpansion1775968149677 implements MigrationInterface {
  name = 'BudgetSchemaExpansion1775968149677';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. Mở rộng project_budgets (thêm 14 columns) ──
    await queryRunner.query(`
      ALTER TABLE "project_budgets"
        ADD COLUMN IF NOT EXISTS "budget_code" VARCHAR(50) UNIQUE,
        ADD COLUMN IF NOT EXISTS "budget_name" VARCHAR(255),
        ADD COLUMN IF NOT EXISTS "fiscal_year" INT DEFAULT 2026,
        ADD COLUMN IF NOT EXISTS "budget_type" VARCHAR(10) DEFAULT 'OPEX',
        ADD COLUMN IF NOT EXISTS "control_level" VARCHAR(10) DEFAULT 'HARD',
        ADD COLUMN IF NOT EXISTS "status" VARCHAR(20) DEFAULT 'DRAFT',
        ADD COLUMN IF NOT EXISTS "allow_carry_forward" BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS "warning_threshold_pct" SMALLINT DEFAULT 90,
        ADD COLUMN IF NOT EXISTS "department_id" UUID,
        ADD COLUMN IF NOT EXISTS "wbs_element_id" UUID,
        ADD COLUMN IF NOT EXISTS "approved_by" UUID,
        ADD COLUMN IF NOT EXISTS "approved_at" TIMESTAMP,
        ADD COLUMN IF NOT EXISTS "created_by" UUID,
        ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP DEFAULT NOW()
    `);

    // Backfill: budget hiện tại → APPROVED + HARD + fiscal_year 2026
    await queryRunner.query(`
      UPDATE "project_budgets"
      SET "status" = 'APPROVED',
          "control_level" = 'HARD',
          "fiscal_year" = 2026
      WHERE "status" = 'DRAFT'
    `);

    // ── 2. Tạo budget_periods ──
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "budget_periods" (
        "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "budget_id" UUID NOT NULL REFERENCES "project_budgets"("id") ON DELETE CASCADE,
        "period_name" VARCHAR(20) NOT NULL,
        "period_start" DATE NOT NULL,
        "period_end" DATE NOT NULL,
        "period_amount" DECIMAL(18,2) DEFAULT 0,
        "consumed_amount" DECIMAL(18,2) DEFAULT 0,
        "committed_amount" DECIMAL(18,2) DEFAULT 0,
        "created_at" TIMESTAMP DEFAULT NOW(),
        "updated_at" TIMESTAMP DEFAULT NOW(),
        CONSTRAINT "UQ_budget_period_name" UNIQUE ("budget_id", "period_name"),
        CONSTRAINT "CHK_period_dates" CHECK ("period_end" >= "period_start")
      )
    `);

    // ── 3. Tạo budget_transaction_logs ──
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "budget_transaction_logs" (
        "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "budget_id" UUID NOT NULL REFERENCES "project_budgets"("id") ON DELETE CASCADE,
        "budget_period_id" UUID REFERENCES "budget_periods"("id") ON DELETE SET NULL,
        "transaction_type" VARCHAR(30) NOT NULL,
        "transaction_id" UUID,
        "transaction_ref" VARCHAR(100),
        "amount" DECIMAL(18,2) NOT NULL,
        "amount_type" VARCHAR(10) NOT NULL,
        "check_result" VARCHAR(10) NOT NULL,
        "available_before" DECIMAL(18,2) NOT NULL,
        "available_after" DECIMAL(18,2) NOT NULL,
        "rejection_reason" TEXT,
        "override_by" UUID,
        "override_reason" TEXT,
        "created_by" UUID,
        "created_at" TIMESTAMP DEFAULT NOW()
      )
    `);

    // Index cho query audit trail
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_BTL_BUDGET_ID"
      ON "budget_transaction_logs" ("budget_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_BTL_CREATED_AT"
      ON "budget_transaction_logs" ("created_at" DESC)
    `);

    // ── 4. Tạo budget_revisions ──
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "budget_revisions" (
        "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "budget_id" UUID NOT NULL REFERENCES "project_budgets"("id") ON DELETE CASCADE,
        "revision_number" INT NOT NULL,
        "previous_amount" DECIMAL(18,2) NOT NULL,
        "revised_amount" DECIMAL(18,2) NOT NULL,
        "reason" TEXT,
        "requested_by" UUID,
        "approved_by" UUID,
        "status" VARCHAR(10) DEFAULT 'PENDING',
        "created_at" TIMESTAMP DEFAULT NOW(),
        CONSTRAINT "UQ_budget_revision_number" UNIQUE ("budget_id", "revision_number")
      )
    `);

    // ── 5. Thêm project_id + category_id cho outbound_orders & purchase_orders ──
    await queryRunner.query(`
      ALTER TABLE "outbound_orders"
        ADD COLUMN IF NOT EXISTS "category_id" UUID,
        ADD COLUMN IF NOT EXISTS "estimated_amount" DECIMAL(18,2)
    `);

    await queryRunner.query(`
      ALTER TABLE "purchase_orders"
        ADD COLUMN IF NOT EXISTS "project_id" UUID,
        ADD COLUMN IF NOT EXISTS "category_id" UUID
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "purchase_orders"
        DROP COLUMN IF EXISTS "project_id",
        DROP COLUMN IF EXISTS "category_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "outbound_orders"
        DROP COLUMN IF EXISTS "category_id",
        DROP COLUMN IF EXISTS "estimated_amount"
    `);

    await queryRunner.query(`DROP TABLE IF EXISTS "budget_revisions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "budget_transaction_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "budget_periods"`);

    await queryRunner.query(`
      ALTER TABLE "project_budgets"
        DROP COLUMN IF EXISTS "budget_code",
        DROP COLUMN IF EXISTS "budget_name",
        DROP COLUMN IF EXISTS "fiscal_year",
        DROP COLUMN IF EXISTS "budget_type",
        DROP COLUMN IF EXISTS "control_level",
        DROP COLUMN IF EXISTS "status",
        DROP COLUMN IF EXISTS "allow_carry_forward",
        DROP COLUMN IF EXISTS "warning_threshold_pct",
        DROP COLUMN IF EXISTS "department_id",
        DROP COLUMN IF EXISTS "wbs_element_id",
        DROP COLUMN IF EXISTS "approved_by",
        DROP COLUMN IF EXISTS "approved_at",
        DROP COLUMN IF EXISTS "created_by",
        DROP COLUMN IF EXISTS "created_at",
        DROP COLUMN IF EXISTS "updated_at"
    `);
  }
}
