import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAlternativeApprover1774944483437 implements MigrationInterface {
  name = 'AddAlternativeApprover1774944483437';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "approval_config_steps" ADD "alternative_approver_id" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "approval_config_steps" DROP COLUMN "alternative_approver_id"`,
    );
  }
}
