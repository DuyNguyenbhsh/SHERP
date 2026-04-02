import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDocumentManagement1774280905050 implements MigrationInterface {
  name = 'AddDocumentManagement1774280905050';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "document_notifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "document_id" uuid NOT NULL, "notification_type" character varying(30) NOT NULL, "is_read" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_7de5048c553564b8412bdab9761" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "project_documents" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "folder_id" uuid NOT NULL, "project_id" character varying NOT NULL, "document_name" character varying(255) NOT NULL, "file_url" text, "mime_type" character varying(100), "expiry_date" date, "status" character varying(30) NOT NULL DEFAULT 'VALID', "notes" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_c0d7fa982569e84a809aa2ff5d2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "project_folders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "project_id" uuid NOT NULL, "folder_code" character varying(50) NOT NULL, "folder_name" character varying(100) NOT NULL, "sort_order" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_1f09a30c340db70027a6c403499" UNIQUE ("project_id", "folder_code"), CONSTRAINT "PK_b21b4fb680573a813afce21727a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "document_notifications" ADD CONSTRAINT "FK_c37d56dae02801b489f1ae05074" FOREIGN KEY ("document_id") REFERENCES "project_documents"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_documents" ADD CONSTRAINT "FK_a34e62258afa4ef4441453a0b35" FOREIGN KEY ("folder_id") REFERENCES "project_folders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_folders" ADD CONSTRAINT "FK_1a2adedad5925434de98e264905" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "project_folders" DROP CONSTRAINT "FK_1a2adedad5925434de98e264905"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_documents" DROP CONSTRAINT "FK_a34e62258afa4ef4441453a0b35"`,
    );
    await queryRunner.query(
      `ALTER TABLE "document_notifications" DROP CONSTRAINT "FK_c37d56dae02801b489f1ae05074"`,
    );
    await queryRunner.query(`DROP TABLE "project_folders"`);
    await queryRunner.query(`DROP TABLE "project_documents"`);
    await queryRunner.query(`DROP TABLE "document_notifications"`);
  }
}
