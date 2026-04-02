import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjectEntity1774279536127 implements MigrationInterface {
  name = 'AddProjectEntity1774279536127';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "projects" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "project_code" character varying(50) NOT NULL, "project_name" character varying(255) NOT NULL, "description" text, "organization_id" uuid, "stage" character varying(30) NOT NULL DEFAULT 'PLANNING', "status" character varying(30) NOT NULL DEFAULT 'DRAFT', "location" character varying(255), "gfa_m2" numeric(12,2), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_11b19c7d40d07fc1a4e167995e1" UNIQUE ("project_code"), CONSTRAINT "PK_6271df0a7aed1d6c0691ce6ac50" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ADD CONSTRAINT "FK_585c8ce06628c70b70100bfb842" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "projects" DROP CONSTRAINT "FK_585c8ce06628c70b70100bfb842"`,
    );
    await queryRunner.query(`DROP TABLE "projects"`);
  }
}
