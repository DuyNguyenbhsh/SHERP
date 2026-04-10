import { MigrationInterface, QueryRunner } from 'typeorm';

export class PendingInfoAndAttachments1775807803033 implements MigrationInterface {
  name = 'PendingInfoAndAttachments1775807803033';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "request_attachments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "request_id" uuid NOT NULL, "file_url" character varying(500) NOT NULL, "file_name" character varying(255) NOT NULL, "file_size" integer, "uploaded_by_role" character varying(30) NOT NULL DEFAULT 'PROPOSER', "uploaded_by" character varying, "uploaded_by_name" character varying(100), "uploaded_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_7eff3ce4a007da531c94a391dbd" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8cde69b56c722cafc14d99f95f" ON "request_attachments" ("request_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "suppliers" ADD "is_blacklisted" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_requests" ADD "pending_return_status" character varying(30)`,
    );
    await queryRunner.query(
      `ALTER TABLE "request_attachments" ADD CONSTRAINT "FK_8cde69b56c722cafc14d99f95f3" FOREIGN KEY ("request_id") REFERENCES "project_requests"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "request_attachments" DROP CONSTRAINT "FK_8cde69b56c722cafc14d99f95f3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_requests" DROP COLUMN "pending_return_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "suppliers" DROP COLUMN "is_blacklisted"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8cde69b56c722cafc14d99f95f"`,
    );
    await queryRunner.query(`DROP TABLE "request_attachments"`);
  }
}
