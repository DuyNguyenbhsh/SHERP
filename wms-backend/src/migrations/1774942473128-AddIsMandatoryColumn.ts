import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsMandatoryColumn1774942473128 implements MigrationInterface {
  name = 'AddIsMandatoryColumn1774942473128';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "approval_config_steps" ADD "is_mandatory" boolean NOT NULL DEFAULT true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "approval_config_steps" DROP COLUMN "is_mandatory"`,
    );
  }
}
