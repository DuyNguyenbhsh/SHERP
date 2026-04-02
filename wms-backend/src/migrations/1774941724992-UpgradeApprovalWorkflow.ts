import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpgradeApprovalWorkflow1774941724992 implements MigrationInterface {
  name = 'UpgradeApprovalWorkflow1774941724992';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // approval_config_steps: parallel + delegation
    await queryRunner.query(
      `ALTER TABLE "approval_config_steps" ADD "required_count" integer NOT NULL DEFAULT '1'`,
    );
    await queryRunner.query(
      `ALTER TABLE "approval_config_steps" ADD "delegate_to_id" character varying`,
    );

    // approval_configs: module + description
    await queryRunner.query(
      `ALTER TABLE "approval_configs" ADD "description" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "approval_configs" ADD "module_code" character varying(50)`,
    );

    // approval_steps: audit trail enrichment
    await queryRunner.query(
      `ALTER TABLE "approval_steps" ADD "approver_name" character varying(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "approval_steps" ADD "role_code" character varying(50)`,
    );
    await queryRunner.query(
      `ALTER TABLE "approval_steps" ADD "delegated_from_id" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "approval_steps" DROP COLUMN "delegated_from_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "approval_steps" DROP COLUMN "role_code"`,
    );
    await queryRunner.query(
      `ALTER TABLE "approval_steps" DROP COLUMN "approver_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "approval_configs" DROP COLUMN "module_code"`,
    );
    await queryRunner.query(
      `ALTER TABLE "approval_configs" DROP COLUMN "description"`,
    );
    await queryRunner.query(
      `ALTER TABLE "approval_config_steps" DROP COLUMN "delegate_to_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "approval_config_steps" DROP COLUMN "required_count"`,
    );
  }
}
