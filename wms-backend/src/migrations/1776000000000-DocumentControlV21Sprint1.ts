import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Document Control v2.1 — Sprint 1: Version Control Foundation
 *
 * Thay đổi:
 * 1. Tạo bảng `document_versions` (append-only, lưu lịch sử version)
 * 2. Thêm cột `current_version_id`, `approved_version_id`, `doc_type`, `tags` vào `project_documents`
 * 3. Nới rộng cột `status` của `project_documents` thành varchar(30) để chứa enum lifecycle mới
 * 4. Backfill: mỗi document có file_url hiện tại → tạo record V1.0 tương ứng
 */
export class DocumentControlV21Sprint11776000000000 implements MigrationInterface {
  name = 'DocumentControlV21Sprint11776000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Nới rộng status column để chứa enum mới (DRAFT, PENDING_APPROVAL, ...)
    await queryRunner.query(
      `ALTER TABLE "project_documents" ALTER COLUMN "status" TYPE varchar(30)`,
    );

    // 2. Thêm columns mới cho project_documents
    await queryRunner.query(
      `ALTER TABLE "project_documents" ADD "current_version_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_documents" ADD "approved_version_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_documents" ADD "doc_type" varchar(50)`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_documents" ADD "tags" text[]`,
    );

    // 3. Tạo bảng document_versions
    await queryRunner.query(
      `CREATE TABLE "document_versions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "document_id" uuid NOT NULL,
        "version_number" varchar(10) NOT NULL,
        "version_seq" integer NOT NULL,
        "file_url" text NOT NULL,
        "cloudinary_public_id" varchar(500),
        "file_name" varchar(500) NOT NULL,
        "file_size" bigint NOT NULL,
        "mime_type" varchar(100),
        "checksum" varchar(64) NOT NULL,
        "change_note" text NOT NULL,
        "source_version_id" uuid,
        "uploaded_by" uuid NOT NULL,
        "is_archived" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_document_versions" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_DOCVER_SEQ" ON "document_versions" ("document_id", "version_seq")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_DOCVER_CHECKSUM" ON "document_versions" ("checksum")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_DOCVER_DOCUMENT" ON "document_versions" ("document_id", "version_seq")`,
    );

    await queryRunner.query(
      `ALTER TABLE "document_versions" ADD CONSTRAINT "FK_DOCVER_DOCUMENT"
        FOREIGN KEY ("document_id") REFERENCES "project_documents"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    // 4. FK cho current/approved version (nullable, không cascade — tránh vòng lặp)
    await queryRunner.query(
      `ALTER TABLE "project_documents" ADD CONSTRAINT "FK_DOC_CURRENT_VERSION"
        FOREIGN KEY ("current_version_id") REFERENCES "document_versions"("id")
        ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_documents" ADD CONSTRAINT "FK_DOC_APPROVED_VERSION"
        FOREIGN KEY ("approved_version_id") REFERENCES "document_versions"("id")
        ON DELETE SET NULL ON UPDATE NO ACTION`,
    );

    // 5. Backfill: mỗi document có file_url hiện tại → tạo V1.0
    //    Dùng SHA-256 placeholder 'legacy-<uuid>' vì không có buffer gốc để hash
    //    uploaded_by = document.created_by nếu có, fallback NULL (column vừa thêm nên có thể phải skip nếu không có source)
    //    Giải pháp: dùng first user id trong bảng users làm fallback nếu cần
    await queryRunner.query(`
      INSERT INTO "document_versions"
        ("document_id", "version_number", "version_seq", "file_url",
         "file_name", "file_size", "mime_type", "checksum", "change_note",
         "uploaded_by", "created_at")
      SELECT
        d.id,
        'V1.0',
        1,
        d.file_url,
        d.document_name,
        0,
        d.mime_type,
        'legacy-' || d.id::text,
        'Phiên bản khởi tạo (backfill từ dữ liệu cũ)',
        COALESCE(
          (SELECT id FROM users WHERE is_active = true ORDER BY created_at ASC LIMIT 1),
          uuid_generate_v4()
        ),
        d.created_at
      FROM "project_documents" d
      WHERE d.file_url IS NOT NULL AND d.file_url <> ''
    `);

    // 6. Cập nhật current_version_id cho documents đã backfill
    await queryRunner.query(`
      UPDATE "project_documents" d
      SET "current_version_id" = v.id
      FROM "document_versions" v
      WHERE v.document_id = d.id AND v.version_seq = 1
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "project_documents" DROP CONSTRAINT IF EXISTS "FK_DOC_APPROVED_VERSION"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_documents" DROP CONSTRAINT IF EXISTS "FK_DOC_CURRENT_VERSION"`,
    );
    await queryRunner.query(
      `ALTER TABLE "document_versions" DROP CONSTRAINT IF EXISTS "FK_DOCVER_DOCUMENT"`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_DOCVER_DOCUMENT"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_DOCVER_CHECKSUM"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."UQ_DOCVER_SEQ"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "document_versions"`);

    await queryRunner.query(
      `ALTER TABLE "project_documents" DROP COLUMN IF EXISTS "tags"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_documents" DROP COLUMN IF EXISTS "doc_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_documents" DROP COLUMN IF EXISTS "approved_version_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_documents" DROP COLUMN IF EXISTS "current_version_id"`,
    );
  }
}
