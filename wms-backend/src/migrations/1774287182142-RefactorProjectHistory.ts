import { MigrationInterface, QueryRunner } from 'typeorm';

export class RefactorProjectHistory1774287182142 implements MigrationInterface {
  name = 'RefactorProjectHistory1774287182142';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "project_history" DROP COLUMN "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_history" ADD "change_reason" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_history" ADD "metadata" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_history" ADD "changed_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_history" DROP COLUMN "changed_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_history" ADD "changed_by" character varying`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_project_history_project_id" ON "project_history" ("project_id") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."idx_project_history_project_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_history" DROP COLUMN "changed_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_history" ADD "changed_by" character varying(50)`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_history" DROP COLUMN "changed_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_history" DROP COLUMN "metadata"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_history" DROP COLUMN "change_reason"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_history" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
  }
}
