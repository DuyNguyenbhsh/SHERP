import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjectAssignment1774279867504 implements MigrationInterface {
  name = 'AddProjectAssignment1774279867504';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "project_assignments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "project_id" uuid NOT NULL, "employee_id" uuid NOT NULL, "role" character varying(30) NOT NULL DEFAULT 'MEMBER', "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_dd102c3b6dbf63be80bd413fbbb" UNIQUE ("project_id", "employee_id"), CONSTRAINT "PK_045df8f32ae1d54810b39b9c7bd" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_assignments" ADD CONSTRAINT "FK_55de07519449f4031e4a3a89714" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_assignments" ADD CONSTRAINT "FK_21034b2728f7c31ae81b59de5ff" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "project_assignments" DROP CONSTRAINT "FK_21034b2728f7c31ae81b59de5ff"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_assignments" DROP CONSTRAINT "FK_55de07519449f4031e4a3a89714"`,
    );
    await queryRunner.query(`DROP TABLE "project_assignments"`);
  }
}
