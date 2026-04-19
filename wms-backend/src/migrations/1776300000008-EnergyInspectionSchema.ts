import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnergyInspectionSchema1776300000008 implements MigrationInterface {
  name = 'EnergyInspectionSchema1776300000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "meter_type" AS ENUM ('ELECTRICITY','WATER','GAS');
    `);
    await queryRunner.query(`
      CREATE TYPE "energy_inspection_status" AS ENUM ('NEW','IN_PROGRESS','COMPLETED');
    `);

    // energy_meters
    await queryRunner.query(`
      CREATE TABLE "energy_meters" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "code" varchar(40) NOT NULL,
        "name" varchar(200) NOT NULL,
        "project_id" uuid NOT NULL,
        "meter_type" "meter_type" NOT NULL,
        "unit" varchar(20) NOT NULL,
        "location_text" varchar(200),
        "is_cumulative" boolean NOT NULL DEFAULT true,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_EM_CODE" ON "energy_meters" ("code");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_EM_PROJECT_ACTIVE" ON "energy_meters" ("project_id","is_active");
    `);

    // energy_inspections
    await queryRunner.query(`
      CREATE TABLE "energy_inspections" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "project_id" uuid NOT NULL,
        "work_item_id" uuid,
        "assignee_id" uuid NOT NULL,
        "inspection_date" date NOT NULL,
        "due_date" timestamptz,
        "status" "energy_inspection_status" NOT NULL DEFAULT 'NEW',
        "notes" text,
        "required_meter_ids" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "completed_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_EI_PROJECT_STATUS" ON "energy_inspections" ("project_id","status");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_EI_ASSIGNEE_STATUS" ON "energy_inspections" ("assignee_id","status");
    `);

    // energy_readings
    await queryRunner.query(`
      CREATE TABLE "energy_readings" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "inspection_id" uuid NOT NULL REFERENCES "energy_inspections"("id") ON DELETE CASCADE,
        "meter_id" uuid NOT NULL REFERENCES "energy_meters"("id") ON DELETE RESTRICT,
        "value" numeric(18,4) NOT NULL,
        "previous_value" numeric(18,4),
        "delta" numeric(18,4),
        "photo_url" varchar(500),
        "notes" text,
        "recorded_by" uuid NOT NULL,
        "recorded_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_ER_INSPECTION" ON "energy_readings" ("inspection_id");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_ER_METER_DATE" ON "energy_readings" ("meter_id","recorded_at");
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_ER_UNIQUE" ON "energy_readings" ("inspection_id","meter_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "energy_readings";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "energy_inspections";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "energy_meters";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "energy_inspection_status";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "meter_type";`);
  }
}
