import { MigrationInterface, QueryRunner } from 'typeorm';

export class MasterPlanPrivilegesSeed1776300000001 implements MigrationInterface {
  name = 'MasterPlanPrivilegesSeed1776300000001';

  // 5 privilege cho Master Plan + Work Items (Phase A).
  // 4 sub-module (Checklist/Incident/Energy/Office) seed kèm khi code module đó.
  private readonly privileges = [
    { code: 'VIEW_MASTER_PLAN', name: 'Xem Master Plan' },
    {
      code: 'MANAGE_MASTER_PLAN',
      name: 'Quản lý Master Plan (CRUD + WBS + template)',
    },
    {
      code: 'APPROVE_MASTER_PLAN',
      name: 'Phê duyệt Master Plan (DRAFT → ACTIVE)',
    },
    { code: 'VIEW_WORK_ITEM', name: 'Xem công việc (feed + detail)' },
    {
      code: 'EXECUTE_WORK_ITEM',
      name: 'Thực thi công việc (update + reassign)',
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
