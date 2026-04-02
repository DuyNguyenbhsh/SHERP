import { MigrationInterface, QueryRunner } from 'typeorm';

export class AuditMasterDataConstraints1774285207387 implements MigrationInterface {
  name = 'AuditMasterDataConstraints1774285207387';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "projects" DROP CONSTRAINT "FK_f124be8f746d28f6414b99d2a65"`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" DROP CONSTRAINT "FK_87bd52575ded2be008b89dd7b21"`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" DROP CONSTRAINT "FK_2424cc4e3a57f1ddf0d002ebaea"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizations" ADD "cost_center_code" character varying(20)`,
    );
    await queryRunner.query(
      `ALTER TABLE "employees" ADD "job_title" character varying(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ADD CONSTRAINT "FK_2424cc4e3a57f1ddf0d002ebaea" FOREIGN KEY ("investor_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ADD CONSTRAINT "FK_87bd52575ded2be008b89dd7b21" FOREIGN KEY ("manager_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ADD CONSTRAINT "FK_f124be8f746d28f6414b99d2a65" FOREIGN KEY ("department_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "projects" DROP CONSTRAINT "FK_f124be8f746d28f6414b99d2a65"`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" DROP CONSTRAINT "FK_87bd52575ded2be008b89dd7b21"`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" DROP CONSTRAINT "FK_2424cc4e3a57f1ddf0d002ebaea"`,
    );
    await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "job_title"`);
    await queryRunner.query(
      `ALTER TABLE "organizations" DROP COLUMN "cost_center_code"`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ADD CONSTRAINT "FK_2424cc4e3a57f1ddf0d002ebaea" FOREIGN KEY ("investor_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ADD CONSTRAINT "FK_87bd52575ded2be008b89dd7b21" FOREIGN KEY ("manager_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ADD CONSTRAINT "FK_f124be8f746d28f6414b99d2a65" FOREIGN KEY ("department_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }
}
