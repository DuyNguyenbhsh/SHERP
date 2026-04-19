import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChecklistSchema1776300000002 implements MigrationInterface {
  name = 'ChecklistSchema1776300000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Enum types ─────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE "checklist_frequency" AS ENUM ('DAILY','WEEKLY','MONTHLY','SHIFT');
    `);
    await queryRunner.query(`
      CREATE TYPE "checklist_result_type" AS ENUM ('PASS_FAIL','VALUE','PHOTO_ONLY','MIXED');
    `);
    await queryRunner.query(`
      CREATE TYPE "checklist_instance_status" AS ENUM ('NEW','IN_PROGRESS','COMPLETED');
    `);
    await queryRunner.query(`
      CREATE TYPE "item_result_state" AS ENUM ('PASS','FAIL','NA');
    `);
    await queryRunner.query(`
      CREATE TYPE "photo_category" AS ENUM ('BEFORE_FIX','AFTER_FIX','EVIDENCE');
    `);

    // ── checklist_templates ────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "checklist_templates" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar(200) NOT NULL,
        "description" text,
        "frequency" "checklist_frequency" NOT NULL,
        "asset_type" varchar(40),
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_CLT_ACTIVE" ON "checklist_templates" ("is_active","frequency");
    `);

    // ── checklist_item_templates ───────────────────────────
    await queryRunner.query(`
      CREATE TABLE "checklist_item_templates" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "template_id" uuid NOT NULL REFERENCES "checklist_templates"("id") ON DELETE CASCADE,
        "display_order" int NOT NULL,
        "content" varchar(500) NOT NULL,
        "result_type" "checklist_result_type" NOT NULL DEFAULT 'PASS_FAIL',
        "require_photo" boolean NOT NULL DEFAULT false,
        "value_unit" varchar(20),
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_CLIT_TEMPLATE_ORDER" ON "checklist_item_templates" ("template_id","display_order");
    `);

    // ── checklist_instances ────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "checklist_instances" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "template_id" uuid NOT NULL REFERENCES "checklist_templates"("id") ON DELETE RESTRICT,
        "work_item_id" uuid,
        "assignee_id" uuid NOT NULL,
        "due_date" timestamptz,
        "status" "checklist_instance_status" NOT NULL DEFAULT 'NEW',
        "completed_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_CI_WORK_ITEM" ON "checklist_instances" ("work_item_id");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_CI_ASSIGNEE_STATUS" ON "checklist_instances" ("assignee_id","status");
    `);

    // ── checklist_item_results ─────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "checklist_item_results" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "instance_id" uuid NOT NULL REFERENCES "checklist_instances"("id") ON DELETE CASCADE,
        "item_template_id" uuid NOT NULL REFERENCES "checklist_item_templates"("id") ON DELETE RESTRICT,
        "result" "item_result_state",
        "value" numeric(18,4),
        "photos" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "photo_category" "photo_category",
        "notes" text,
        "checked_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_CIR_INSTANCE" ON "checklist_item_results" ("instance_id");
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_CIR_UNIQUE" ON "checklist_item_results" ("instance_id","item_template_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "checklist_item_results";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "checklist_instances";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "checklist_item_templates";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "checklist_templates";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "photo_category";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "item_result_state";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "checklist_instance_status";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "checklist_result_type";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "checklist_frequency";`);
  }
}
