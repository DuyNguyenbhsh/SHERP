import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjectSoftDelete1774284191394 implements MigrationInterface {
  name = 'AddProjectSoftDelete1774284191394';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "projects" ADD "deleted_at" TIMESTAMP`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "deleted_at"`);
  }
}
