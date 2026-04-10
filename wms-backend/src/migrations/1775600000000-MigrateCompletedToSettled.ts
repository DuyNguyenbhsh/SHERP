import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrateCompletedToSettled1775600000000 implements MigrationInterface {
  name = 'MigrateCompletedToSettled1775600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Data migration: chuyen du an COMPLETED sang SETTLED theo status flow moi
    await queryRunner.query(
      `UPDATE "projects" SET "status" = 'SETTLED' WHERE "status" = 'COMPLETED'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback: chuyen lai ve COMPLETED
    await queryRunner.query(
      `UPDATE "projects" SET "status" = 'COMPLETED' WHERE "status" = 'SETTLED'`,
    );
  }
}
