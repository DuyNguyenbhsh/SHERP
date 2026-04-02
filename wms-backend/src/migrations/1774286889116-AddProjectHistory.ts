import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjectHistory1774286889116 implements MigrationInterface {
  name = 'AddProjectHistory1774286889116';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "project_history" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "project_id" uuid NOT NULL, "field_name" character varying(50) NOT NULL, "old_value" text, "new_value" text, "old_label" text, "new_label" text, "changed_by" character varying(50), "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ebb2afe7b38faa45844bfa91211" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_history" ADD CONSTRAINT "FK_fba27c15eca183d4a3af4915735" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "project_history" DROP CONSTRAINT "FK_fba27c15eca183d4a3af4915735"`,
    );
    await queryRunner.query(`DROP TABLE "project_history"`);
  }
}
