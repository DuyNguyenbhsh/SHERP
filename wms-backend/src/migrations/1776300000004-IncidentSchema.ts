import { MigrationInterface, QueryRunner } from 'typeorm';

export class IncidentSchema1776300000004 implements MigrationInterface {
  name = 'IncidentSchema1776300000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enum types
    await queryRunner.query(`
      CREATE TYPE "incident_status" AS ENUM ('NEW','IN_PROGRESS','RESOLVED','COMPLETED');
    `);
    await queryRunner.query(`
      CREATE TYPE "incident_severity" AS ENUM ('LOW','MEDIUM','HIGH','CRITICAL');
    `);
    await queryRunner.query(`
      CREATE TYPE "incident_category" AS ENUM ('ELECTRICAL','PLUMBING','HVAC','SECURITY','OTHER');
    `);
    await queryRunner.query(`
      CREATE TYPE "incident_approval_status" AS ENUM ('PENDING','APPROVED','REJECTED');
    `);
    // Dùng lại "photo_category" đã tạo ở 1776300000002-ChecklistSchema

    // incidents
    await queryRunner.query(`
      CREATE TABLE "incidents" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "incident_code" varchar(40) NOT NULL UNIQUE,
        "title" varchar(200) NOT NULL,
        "description" text NOT NULL,
        "project_id" uuid NOT NULL,
        "work_item_id" uuid,
        "severity" "incident_severity" NOT NULL,
        "category" "incident_category" NOT NULL DEFAULT 'OTHER',
        "location_text" varchar(200),
        "related_asset" varchar(100),
        "reported_by" uuid NOT NULL,
        "assigned_to" uuid,
        "status" "incident_status" NOT NULL DEFAULT 'NEW',
        "due_date" timestamptz,
        "assigned_at" timestamptz,
        "resolved_at" timestamptz,
        "closed_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_INC_PROJECT_STATUS" ON "incidents" ("project_id","status");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_INC_ASSIGNEE" ON "incidents" ("assigned_to");
    `);

    // incident_photos
    await queryRunner.query(`
      CREATE TABLE "incident_photos" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "incident_id" uuid NOT NULL REFERENCES "incidents"("id") ON DELETE CASCADE,
        "secure_url" varchar(500) NOT NULL,
        "category" "photo_category" NOT NULL,
        "uploaded_by" uuid NOT NULL,
        "uploaded_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_IP_INCIDENT" ON "incident_photos" ("incident_id");
    `);

    // incident_comments
    await queryRunner.query(`
      CREATE TABLE "incident_comments" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "incident_id" uuid NOT NULL REFERENCES "incidents"("id") ON DELETE CASCADE,
        "actor_id" uuid NOT NULL,
        "body" text NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_ICMT_INCIDENT" ON "incident_comments" ("incident_id","created_at");
    `);

    // incident_reopen_requests
    await queryRunner.query(`
      CREATE TABLE "incident_reopen_requests" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "incident_id" uuid NOT NULL REFERENCES "incidents"("id") ON DELETE CASCADE,
        "requested_by" uuid NOT NULL,
        "reason" text NOT NULL,
        "status" "incident_approval_status" NOT NULL DEFAULT 'PENDING',
        "decided_by" uuid,
        "decided_at" timestamptz,
        "decision_note" text,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_IRR_INCIDENT_STATUS" ON "incident_reopen_requests" ("incident_id","status");
    `);

    // incident_assignee_change_requests
    await queryRunner.query(`
      CREATE TABLE "incident_assignee_change_requests" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "incident_id" uuid NOT NULL REFERENCES "incidents"("id") ON DELETE CASCADE,
        "requested_by" uuid NOT NULL,
        "proposed_assignee_id" uuid NOT NULL,
        "reason" text NOT NULL,
        "status" "incident_approval_status" NOT NULL DEFAULT 'PENDING',
        "decided_by" uuid,
        "decided_at" timestamptz,
        "decision_note" text,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_IACR_INCIDENT_STATUS" ON "incident_assignee_change_requests" ("incident_id","status");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS "incident_assignee_change_requests";`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "incident_reopen_requests";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "incident_comments";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "incident_photos";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "incidents";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "incident_approval_status";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "incident_category";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "incident_severity";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "incident_status";`);
  }
}
