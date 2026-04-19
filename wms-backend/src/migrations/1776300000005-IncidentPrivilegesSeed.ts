import { MigrationInterface, QueryRunner } from 'typeorm';

export class IncidentPrivilegesSeed1776300000005 implements MigrationInterface {
  name = 'IncidentPrivilegesSeed1776300000005';

  private readonly privileges = [
    { code: 'REPORT_INCIDENT', name: 'Báo sự cố — tạo mới + upload ảnh' },
    { code: 'VIEW_INCIDENT', name: 'Xem sự cố' },
    { code: 'ASSIGN_INCIDENT', name: 'Giao việc sự cố (NEW → IN_PROGRESS)' },
    { code: 'RESOLVE_INCIDENT', name: 'Báo xong sự cố + upload AFTER_FIX' },
    {
      code: 'CLOSE_INCIDENT',
      name: 'Đóng sự cố (RESOLVED → COMPLETED) — QLDA',
    },
    { code: 'APPROVE_INCIDENT_REOPEN', name: 'Phê duyệt yêu cầu mở lại sự cố' },
    { code: 'APPROVE_ASSIGNEE_CHANGE', name: 'Phê duyệt đổi người phụ trách' },
    { code: 'EXPORT_INCIDENT', name: 'Export báo cáo sự cố (.docx) [Phase B]' },
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
