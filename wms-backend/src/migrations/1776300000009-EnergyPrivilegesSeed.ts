import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnergyPrivilegesSeed1776300000009 implements MigrationInterface {
  name = 'EnergyPrivilegesSeed1776300000009';

  private readonly privileges = [
    { code: 'MANAGE_ENERGY_METER', name: 'Quản lý Meter + tạo Inspection' },
    {
      code: 'EXECUTE_ENERGY_INSPECTION',
      name: 'Ghi reading đồng hồ điện/nước/gas',
    },
    {
      code: 'EXPORT_ENERGY_REPORT',
      name: 'Export báo cáo năng lượng [Phase B]',
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
