import { MigrationInterface, QueryRunner } from 'typeorm';

export class OfficeTaskSchema1776300000006 implements MigrationInterface {
  name = 'OfficeTaskSchema1776300000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "office_task_status" AS ENUM ('NEW','IN_PROGRESS','COMPLETED');
    `);

    await queryRunner.query(`
      CREATE TABLE "office_tasks" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "title" varchar(200) NOT NULL,
        "description" text,
        "project_id" uuid NOT NULL,
        "work_item_id" uuid,
        "assignee_id" uuid NOT NULL,
        "due_date" timestamptz,
        "status" "office_task_status" NOT NULL DEFAULT 'NEW',
        "attachments" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "completed_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_OT_PROJECT_STATUS" ON "office_tasks" ("project_id","status");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_OT_ASSIGNEE_STATUS" ON "office_tasks" ("assignee_id","status");
    `);

    await queryRunner.query(`
      CREATE TABLE "office_task_items" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "task_id" uuid NOT NULL REFERENCES "office_tasks"("id") ON DELETE CASCADE,
        "display_order" int NOT NULL,
        "content" varchar(500) NOT NULL,
        "is_done" boolean NOT NULL DEFAULT false,
        "completed_by" uuid,
        "completed_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_OTI_TASK_ORDER" ON "office_task_items" ("task_id","display_order");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "office_task_items";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "office_tasks";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "office_task_status";`);
  }
}
