import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Master Plan SUPPLEMENT (2026-04-20)
 * - ALTER master_plans +3 cột sign-off (SA §15.1.5, BA §10.7)
 * - Seed privilege MANAGE_FACILITY_CATALOG (SA §15.8)
 */
export class MasterPlanSignOff1776300000012 implements MigrationInterface {
  name = 'MasterPlanSignOff1776300000012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 3 cột sign-off
    await queryRunner.query(`
      ALTER TABLE "master_plans"
        ADD COLUMN "prepared_by_id" uuid,
        ADD COLUMN "prepared_at" date,
        ADD COLUMN "location_label" varchar(120);
    `);

    // Privilege mới
    await queryRunner.query(
      `INSERT INTO privileges (id, privilege_code, privilege_name, module, is_active, created_at, updated_at)
       VALUES (uuid_generate_v4(), $1, $2, 'MASTER_PLAN', true, now(), now())
       ON CONFLICT (privilege_code) DO NOTHING`,
      [
        'MANAGE_FACILITY_CATALOG',
        'Quản lý danh mục Hệ thống/Thiết bị của toà nhà',
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM privileges WHERE privilege_code = 'MANAGE_FACILITY_CATALOG'`,
    );
    await queryRunner.query(`
      ALTER TABLE "master_plans"
        DROP COLUMN IF EXISTS "location_label",
        DROP COLUMN IF EXISTS "prepared_at",
        DROP COLUMN IF EXISTS "prepared_by_id";
    `);
  }
}
