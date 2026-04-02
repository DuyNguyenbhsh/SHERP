import { MigrationInterface, QueryRunner } from 'typeorm';

export class OrgChartHrFoundation1774517425299 implements MigrationInterface {
  name = 'OrgChartHrFoundation1774517425299';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "positions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "position_code" character varying(50) NOT NULL, "position_name" character varying(100) NOT NULL, "scope" character varying(10) NOT NULL DEFAULT 'SITE', "department_type" character varying(50), "sort_order" integer NOT NULL DEFAULT '0', "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "default_role_id" uuid, CONSTRAINT "UQ_51d14068176b10b853627454ba9" UNIQUE ("position_code"), CONSTRAINT "PK_17e4e62ccd5749b289ae3fae6f3" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizations" ADD "is_active" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(`ALTER TABLE "employees" ADD "hire_date" date`);
    await queryRunner.query(`ALTER TABLE "employees" ADD "position_id" uuid`);
    await queryRunner.query(
      `ALTER TABLE "project_assignments" ADD "assigned_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_assignments" ADD "released_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_assignments" ADD "is_active" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "positions" ADD CONSTRAINT "FK_37180b7d61d8df839a1542d24ac" FOREIGN KEY ("default_role_id") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "employees" ADD CONSTRAINT "FK_8b14204e8af5e371e36b8c11e1b" FOREIGN KEY ("position_id") REFERENCES "positions"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "employees" DROP CONSTRAINT "FK_8b14204e8af5e371e36b8c11e1b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "positions" DROP CONSTRAINT "FK_37180b7d61d8df839a1542d24ac"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_assignments" DROP COLUMN "is_active"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_assignments" DROP COLUMN "released_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_assignments" DROP COLUMN "assigned_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "employees" DROP COLUMN "position_id"`,
    );
    await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "hire_date"`);
    await queryRunner.query(
      `ALTER TABLE "organizations" DROP COLUMN "is_active"`,
    );
    await queryRunner.query(`DROP TABLE "positions"`);
  }
}
