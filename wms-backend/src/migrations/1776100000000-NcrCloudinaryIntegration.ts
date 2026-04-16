import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * NCR Cloudinary Integration — thêm 5 columns cho ncr_attachments,
 * mark record cũ (chưa có public_id) là is_missing=true để UI hiển thị
 * "Missing Document" thay vì broken link.
 */
export class NcrCloudinaryIntegration1776100000000 implements MigrationInterface {
  name = 'NcrCloudinaryIntegration1776100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "ncr_attachments"
        ADD COLUMN "public_id" varchar(255),
        ADD COLUMN "file_size" integer,
        ADD COLUMN "file_format" varchar(20),
        ADD COLUMN "resource_type" varchar(20) DEFAULT 'image',
        ADD COLUMN "is_missing" boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(
      `CREATE INDEX "idx_ncr_attachments_public_id" ON "ncr_attachments"("public_id")`,
    );

    // Backfill: record cũ (file_url placeholder, chưa có public_id) → đánh dấu orphan
    await queryRunner.query(`
      UPDATE "ncr_attachments"
      SET "is_missing" = true
      WHERE "public_id" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_ncr_attachments_public_id"`,
    );
    await queryRunner.query(`
      ALTER TABLE "ncr_attachments"
        DROP COLUMN "public_id",
        DROP COLUMN "file_size",
        DROP COLUMN "file_format",
        DROP COLUMN "resource_type",
        DROP COLUMN "is_missing"
    `);
  }
}
