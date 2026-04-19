import { MigrationInterface, QueryRunner } from 'typeorm';

export class MasterPlanSchema1776300000000 implements MigrationInterface {
  name = 'MasterPlanSchema1776300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Enum types ─────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE "master_plan_status" AS ENUM ('DRAFT','ACTIVE','CLOSED');
    `);
    await queryRunner.query(`
      CREATE TYPE "wbs_node_type" AS ENUM ('WORKSTREAM','SYSTEM','WORK_PACKAGE','TASK_TEMPLATE');
    `);
    await queryRunner.query(`
      CREATE TYPE "work_item_type" AS ENUM ('CHECKLIST','INCIDENT','ENERGY_INSPECTION','OFFICE_TASK');
    `);
    await queryRunner.query(`
      CREATE TYPE "work_item_status" AS ENUM ('NEW','IN_PROGRESS','COMPLETED');
    `);

    // ── master_plans ──────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "master_plans" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "code" varchar(40) NOT NULL UNIQUE,
        "name" varchar(200) NOT NULL,
        "year" int NOT NULL,
        "project_id" uuid NOT NULL,
        "budget_vnd" bigint NOT NULL DEFAULT 0,
        "status" "master_plan_status" NOT NULL DEFAULT 'DRAFT',
        "start_date" date,
        "end_date" date,
        "approved_by" uuid,
        "approved_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_MP_PROJECT_YEAR" ON "master_plans" ("project_id","year");
    `);

    // ── wbs_nodes ─────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "wbs_nodes" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "plan_id" uuid NOT NULL REFERENCES "master_plans"("id") ON DELETE CASCADE,
        "parent_id" uuid REFERENCES "wbs_nodes"("id") ON DELETE SET NULL,
        "wbs_code" varchar(20) NOT NULL,
        "name" varchar(200) NOT NULL,
        "level" smallint NOT NULL,
        "node_type" "wbs_node_type" NOT NULL,
        "budget_vnd" bigint NOT NULL DEFAULT 0,
        "start_date" date,
        "end_date" date,
        "responsible_employee_id" uuid,
        "is_archived" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_WBS_PLAN_CODE" ON "wbs_nodes" ("plan_id","wbs_code");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_WBS_PARENT" ON "wbs_nodes" ("parent_id");
    `);

    // ── task_templates ────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "task_templates" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "wbs_node_id" uuid NOT NULL REFERENCES "wbs_nodes"("id") ON DELETE CASCADE,
        "name" varchar(200) NOT NULL,
        "work_item_type" "work_item_type" NOT NULL,
        "recurrence_rule" varchar(200) NOT NULL,
        "sla_hours" int NOT NULL DEFAULT 24,
        "template_ref_id" uuid,
        "default_assignee_role" varchar(40),
        "is_active" boolean NOT NULL DEFAULT true,
        "last_generated_date" date,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_TT_NODE" ON "task_templates" ("wbs_node_id");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_TT_ACTIVE_TYPE" ON "task_templates" ("is_active","work_item_type");
    `);

    // ── work_items ────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "work_items" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "work_item_type" "work_item_type" NOT NULL,
        "subject_id" uuid,
        "project_id" uuid NOT NULL,
        "assignee_id" uuid,
        "task_template_id" uuid,
        "scheduled_date" date,
        "due_date" timestamptz,
        "status" "work_item_status" NOT NULL DEFAULT 'NEW',
        "progress_pct" smallint NOT NULL DEFAULT 0,
        "title" varchar(200) NOT NULL,
        "parent_id" uuid REFERENCES "work_items"("id") ON DELETE SET NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_WI_PROJECT_DUE_STATUS" ON "work_items" ("project_id","due_date","status");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_WI_ASSIGNEE_STATUS" ON "work_items" ("assignee_id","status");
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_WI_DEDUP" ON "work_items" ("task_template_id","scheduled_date")
      WHERE "task_template_id" IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "work_items";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "task_templates";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "wbs_nodes";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "master_plans";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "work_item_status";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "work_item_type";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "wbs_node_type";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "master_plan_status";`);
  }
}
