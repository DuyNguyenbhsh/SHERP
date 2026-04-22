import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddViewAllProjectsPrivilege1776300000013 implements MigrationInterface {
  name = 'AddViewAllProjectsPrivilege1776300000013';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. IMMUTABLE wrapper cho unaccent (để index functional được).
    //    Default public.unaccent(text) là STABLE → Postgres từ chối index trực tiếp.
    //    Gọi qua form 2-arg unaccent(dictionary, text) bọc trong SQL function IMMUTABLE.
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION public.f_unaccent(text) RETURNS text
        LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT AS $$
        SELECT public.unaccent('public.unaccent', $1);
      $$;
    `);

    // 2. Seed privilege VIEW_ALL_PROJECTS (idempotent).
    await queryRunner.query(`
      INSERT INTO privileges (id, privilege_code, privilege_name, module, is_active, created_at, updated_at)
      VALUES (uuid_generate_v4(), 'VIEW_ALL_PROJECTS',
              'Xem toàn bộ dự án (bỏ qua filter tổ chức)', 'PROJECT', true, now(), now())
      ON CONFLICT (privilege_code) DO NOTHING;
    `);

    // 3. Index ship V1 cho endpoint GET /projects/lookup (SA_DESIGN §9.2).
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_projects_code_lower
        ON projects (LOWER(project_code));
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_projects_status_active
        ON projects (status) WHERE deleted_at IS NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_projects_org_status
        ON projects (organization_id, status) WHERE deleted_at IS NULL;
    `);
    // GIN trigram trên f_unaccent(LOWER(name)) — hỗ trợ search không dấu.
    // pg_trgm đã enable từ migration 1776300000033-DocumentControlV21Sprint4.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_projects_name_unaccent_trgm
        ON projects USING gin (public.f_unaccent(LOWER(project_name)) gin_trgm_ops);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_projects_name_unaccent_trgm;`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS idx_projects_org_status;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_projects_status_active;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_projects_code_lower;`);
    await queryRunner.query(
      `DELETE FROM privileges WHERE privilege_code = 'VIEW_ALL_PROJECTS';`,
    );
    await queryRunner.query(`DROP FUNCTION IF EXISTS public.f_unaccent(text);`);
  }
}
