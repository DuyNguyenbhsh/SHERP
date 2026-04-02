import { MigrationInterface, QueryRunner } from 'typeorm';

export class EmployeeSoftDeleteStatus1774520321652 implements MigrationInterface {
  name = 'EmployeeSoftDeleteStatus1774520321652';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "employees" ADD "deleted_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "employees" ALTER COLUMN "status" SET DEFAULT 'WORKING'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "employees" ALTER COLUMN "status" SET DEFAULT 'ACTIVE'`,
    );
    await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "deleted_at"`);
  }
}
