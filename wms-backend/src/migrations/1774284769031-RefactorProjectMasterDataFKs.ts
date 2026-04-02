import { MigrationInterface, QueryRunner } from 'typeorm';

export class RefactorProjectMasterDataFKs1774284769031 implements MigrationInterface {
  name = 'RefactorProjectMasterDataFKs1774284769031';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "investor"`);
    await queryRunner.query(
      `ALTER TABLE "projects" DROP COLUMN "project_director"`,
    );
    await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "department"`);
    await queryRunner.query(`ALTER TABLE "projects" ADD "investor_id" uuid`);
    await queryRunner.query(`ALTER TABLE "projects" ADD "manager_id" uuid`);
    await queryRunner.query(`ALTER TABLE "projects" ADD "department_id" uuid`);
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
    await queryRunner.query(
      `ALTER TABLE "projects" DROP COLUMN "department_id"`,
    );
    await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "manager_id"`);
    await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "investor_id"`);
    await queryRunner.query(
      `ALTER TABLE "projects" ADD "department" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ADD "project_director" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ADD "investor" character varying(255)`,
    );
  }
}
