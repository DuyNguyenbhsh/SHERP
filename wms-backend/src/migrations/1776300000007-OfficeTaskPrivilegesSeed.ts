import { MigrationInterface, QueryRunner } from 'typeorm';

export class OfficeTaskPrivilegesSeed1776300000007 implements MigrationInterface {
  name = 'OfficeTaskPrivilegesSeed1776300000007';

  private readonly privileges = [
    {
      code: 'MANAGE_OFFICE_TASK',
      name: 'Quản lý Office Task — tạo + thêm item',
    },
    {
      code: 'EXECUTE_OFFICE_TASK',
      name: 'Thực thi Office Task — tick item + complete',
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
