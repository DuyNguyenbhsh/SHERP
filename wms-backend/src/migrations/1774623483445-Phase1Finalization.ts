import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase1Finalization1774623483445 implements MigrationInterface {
  name = 'Phase1Finalization1774623483445';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "system_settings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "setting_key" character varying(100) NOT NULL, "setting_value" text NOT NULL, "value_type" character varying(50) NOT NULL DEFAULT 'STRING', "description" character varying(200), "category" character varying(50) NOT NULL DEFAULT 'GENERAL', "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_9037e7dec102dfdfb0c5343807f" UNIQUE ("setting_key"), CONSTRAINT "PK_82521f08790d248b2a80cc85d40" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_setting_key" ON "system_settings" ("setting_key") `,
    );
    await queryRunner.query(
      `ALTER TABLE "employees" ADD "document_refs" jsonb`,
    );

    // DEPLOY: Database indexes cho Phase 1 optimization
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_emp_email" ON "employees" ("email") WHERE "email" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_emp_code" ON "employees" ("employee_code")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_emp_manager" ON "employees" ("manager_id") WHERE "manager_id" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_emp_manager"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_emp_code"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_emp_email"`);
    await queryRunner.query(
      `ALTER TABLE "employees" DROP COLUMN "document_refs"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_setting_key"`);
    await queryRunner.query(`DROP TABLE "system_settings"`);
  }
}
