import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Master Plan SUPPLEMENT (2026-04-20): ALTER task_templates +8 cột
 * - bilingual VI/EN (BR-MP-12)
 * - taxonomy System/Equipment (US-MP-10)
 * - executor_party + contractor_name (US-MP-12, BR-MP-08/09)
 * - freq_code mã tắt (US-MP-13, BA §10.5)
 * - regulatory_refs (US-MP-14, BR-MP-11)
 * - allow_adhoc_trigger (BR-MP-10)
 * Backfill executor_party='INTERNAL' cho mọi row cũ.
 */
export class TaskTemplateBilingualExecutor1776300000011 implements MigrationInterface {
  name = 'TaskTemplateBilingualExecutor1776300000011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "task_templates"
        ADD COLUMN "name_en" varchar(500),
        ADD COLUMN "system_id" uuid
          REFERENCES "facility_systems"("id") ON DELETE SET NULL,
        ADD COLUMN "equipment_item_id" uuid
          REFERENCES "facility_equipment_items"("id") ON DELETE SET NULL,
        ADD COLUMN "executor_party" "task_executor_party"
          NOT NULL DEFAULT 'INTERNAL',
        ADD COLUMN "contractor_name" varchar(255),
        ADD COLUMN "freq_code" varchar(16),
        ADD COLUMN "regulatory_refs" jsonb NOT NULL DEFAULT '[]'::jsonb,
        ADD COLUMN "allow_adhoc_trigger" boolean NOT NULL DEFAULT false;
    `);

    // Index
    await queryRunner.query(
      `CREATE INDEX "IDX_TT_SYSTEM" ON "task_templates" ("system_id");`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_TT_EXECUTOR" ON "task_templates" ("executor_party");`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_TT_FREQ" ON "task_templates" ("freq_code");`,
    );

    // CHECK BR-MP-09: contractor_name bắt buộc khi executor là CONTRACTOR/MIXED
    await queryRunner.query(`
      ALTER TABLE "task_templates"
        ADD CONSTRAINT "CK_TT_CONTRACTOR_NAME" CHECK (
          executor_party NOT IN ('CONTRACTOR','MIXED')
          OR (contractor_name IS NOT NULL AND char_length(contractor_name) > 0)
        );
    `);

    // CHECK freq_code enum (dùng CHECK thay vì CREATE TYPE để dễ mở rộng không migration mới)
    await queryRunner.query(`
      ALTER TABLE "task_templates"
        ADD CONSTRAINT "CK_TT_FREQ_CODE" CHECK (
          freq_code IS NULL OR freq_code IN (
            'D','W','BW','M','Q','BiQ','HY','Y','Y_URGENT'
          )
        );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "task_templates" DROP CONSTRAINT IF EXISTS "CK_TT_FREQ_CODE";`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_templates" DROP CONSTRAINT IF EXISTS "CK_TT_CONTRACTOR_NAME";`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_TT_FREQ";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_TT_EXECUTOR";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_TT_SYSTEM";`);
    await queryRunner.query(`
      ALTER TABLE "task_templates"
        DROP COLUMN IF EXISTS "allow_adhoc_trigger",
        DROP COLUMN IF EXISTS "regulatory_refs",
        DROP COLUMN IF EXISTS "freq_code",
        DROP COLUMN IF EXISTS "contractor_name",
        DROP COLUMN IF EXISTS "executor_party",
        DROP COLUMN IF EXISTS "equipment_item_id",
        DROP COLUMN IF EXISTS "system_id",
        DROP COLUMN IF EXISTS "name_en";
    `);
  }
}
