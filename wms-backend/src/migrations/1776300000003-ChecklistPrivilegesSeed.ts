import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChecklistPrivilegesSeed1776300000003 implements MigrationInterface {
  name = 'ChecklistPrivilegesSeed1776300000003';

  private readonly privileges = [
    {
      code: 'MANAGE_CHECKLIST_TEMPLATE',
      name: 'Quản lý Checklist Template (admin)',
    },
    {
      code: 'EXECUTE_CHECKLIST',
      name: 'Thực thi Checklist — tạo instance + submit result',
    },
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const p of this.privileges) {
      await queryRunner.query(
        `INSERT INTO privileges (id, privilege_code, privilege_name, module, is_active, created_at, updated_at)
         VALUES (uuid_generate_v4(), $1, $2, 'MASTER_PLAN', true, now(), now())
         ON CONFLICT (privilege_code) DO NOTHING`,
        [p.code, p.name],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const codes = this.privileges.map((p) => p.code);
    await queryRunner.query(
      `DELETE FROM privileges WHERE privilege_code = ANY($1)`,
      [codes],
    );
  }
}
