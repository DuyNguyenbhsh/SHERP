import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjectErpFields1774282241431 implements MigrationInterface {
  name = 'AddProjectErpFields1774282241431';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "projects" ADD "investor" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ADD "project_director" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ADD "department" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ADD "budget" numeric(15,2)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "budget"`);
    await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "department"`);
    await queryRunner.query(
      `ALTER TABLE "projects" DROP COLUMN "project_director"`,
    );
    await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "investor"`);
  }
}
