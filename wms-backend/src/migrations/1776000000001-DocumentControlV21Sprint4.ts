import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Document Control v2.1 — Sprint 4: Full-text Search & Audit Log
 *
 * Thay đổi:
 * 1. Kích hoạt extensions pg_trgm + unaccent (cho search tiếng Việt)
 * 2. Tạo function unaccent IMMUTABLE wrapper (pg yêu cầu cho generated column)
 * 3. Thêm column `search_vector` tsvector generated (name + notes + tags)
 * 4. Tạo GIN indexes cho search_vector + tags
 * 5. Tạo bảng `document_audit_logs` (append-only)
 */
export class DocumentControlV21Sprint41776000000001 implements MigrationInterface {
  name = 'DocumentControlV21Sprint41776000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Extensions
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS unaccent`);

    // 2. IMMUTABLE wrapper cho unaccent (generated column yêu cầu IMMUTABLE)
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION public.f_unaccent(text)
        RETURNS text
        LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT AS
      $func$ SELECT public.unaccent('public.unaccent', $1) $func$
    `);

    // 2b. Wrapper IMMUTABLE cho array_to_string (PG17: array_to_string là STABLE)
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION public.f_array_to_string(text[], text)
        RETURNS text
        LANGUAGE plpgsql IMMUTABLE PARALLEL SAFE AS
      $func$
      BEGIN
        RETURN array_to_string($1, $2);
      END;
      $func$
    `);

    // 3. search_vector column (generated, always stored)
    await queryRunner.query(`
      ALTER TABLE "project_documents" ADD COLUMN "search_vector" tsvector
      GENERATED ALWAYS AS (
        setweight(to_tsvector('simple'::regconfig, public.f_unaccent(coalesce("document_name", ''))), 'A') ||
        setweight(to_tsvector('simple'::regconfig, public.f_unaccent(coalesce("notes", ''))), 'B') ||
        setweight(to_tsvector('simple'::regconfig, public.f_unaccent(public.f_array_to_string(coalesce("tags", ARRAY[]::text[]), ' '))), 'C')
      ) STORED
    `);

    // 4. GIN indexes
    await queryRunner.query(
      `CREATE INDEX "IDX_DOCS_SEARCH" ON "project_documents" USING GIN("search_vector")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_DOCS_TAGS_GIN" ON "project_documents" USING GIN("tags")`,
    );

    // 5. Audit log table
    await queryRunner.query(
      `CREATE TABLE "document_audit_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "entity_type" varchar(50) NOT NULL,
        "entity_id" uuid NOT NULL,
        "action" varchar(50) NOT NULL,
        "actor_id" uuid,
        "old_data" jsonb,
        "new_data" jsonb,
        "ip" varchar(45),
        "user_agent" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_document_audit_logs" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_DOCAUDIT_ENTITY" ON "document_audit_logs" ("entity_type", "entity_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_DOCAUDIT_ACTOR" ON "document_audit_logs" ("actor_id")`,
    );
    // BRIN cho time-series — tiết kiệm storage
    await queryRunner.query(
      `CREATE INDEX "IDX_DOCAUDIT_CREATED_AT" ON "document_audit_logs" USING BRIN("created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_DOCAUDIT_CREATED_AT"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_DOCAUDIT_ACTOR"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_DOCAUDIT_ENTITY"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "document_audit_logs"`);

    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_DOCS_TAGS_GIN"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_DOCS_SEARCH"`);
    await queryRunner.query(
      `ALTER TABLE "project_documents" DROP COLUMN IF EXISTS "search_vector"`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS public.f_array_to_string(text[], text)`,
    );
    await queryRunner.query(`DROP FUNCTION IF EXISTS public.f_unaccent(text)`);
  }
}
