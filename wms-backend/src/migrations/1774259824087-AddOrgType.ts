import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrgType1774259824087 implements MigrationInterface {
  name = 'AddOrgType1774259824087';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "organizations" ADD "org_type" character varying(30) NOT NULL DEFAULT 'CORPORATE_DEPT'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "organizations" DROP COLUMN "org_type"`,
    );
  }
}
