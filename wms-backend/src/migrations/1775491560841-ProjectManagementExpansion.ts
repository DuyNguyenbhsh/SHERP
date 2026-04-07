import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProjectManagementExpansion1775491560841 implements MigrationInterface {
  name = 'ProjectManagementExpansion1775491560841';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "FK_9760615d88ed518196bb79ea03d"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_emp_email"`);
    await queryRunner.query(`DROP INDEX "public"."idx_emp_code"`);
    await queryRunner.query(`DROP INDEX "public"."idx_emp_manager"`);
    await queryRunner.query(
      `CREATE TABLE "work_item_masters" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "item_code" character varying(50) NOT NULL, "item_name" character varying(255) NOT NULL, "unit" character varying(30), "item_group" character varying(100), "specifications" jsonb, "inspection_checklist" jsonb, "reference_images" jsonb, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_34d235d256bd1e61b54747ab6e0" UNIQUE ("item_code"), CONSTRAINT "PK_5065825e6c2887e0b517654b4d0" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "subcontractor_kpis" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "supplier_id" uuid NOT NULL, "project_id" uuid, "evaluation_period" character varying(20), "evaluation_date" date NOT NULL, "criteria" jsonb NOT NULL, "total_score" numeric(5,2), "result" character varying(10) NOT NULL, "approved_by" uuid, "approved_at" TIMESTAMP, "notes" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_50557d773b8050bbc24450d5f38" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_58ceeaf5171df7e97433af28ed" ON "subcontractor_kpis" ("supplier_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "ncr_attachments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "ncr_id" uuid NOT NULL, "phase" character varying(10) NOT NULL, "file_url" character varying(500) NOT NULL, "file_name" character varying(255), "uploaded_by" character varying, "uploaded_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_c625f8b76820e7a2cb84a1d39f2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0cc686a666a8a08b2161deaad8" ON "ncr_attachments" ("ncr_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "non_conformance_reports" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "ncr_code" character varying(50) NOT NULL, "project_id" uuid NOT NULL, "category" character varying(20) NOT NULL, "severity" character varying(20) NOT NULL, "related_type" character varying(20), "related_id" character varying(255), "description" text NOT NULL, "location_detail" character varying(255), "assigned_to" uuid, "assigned_by" uuid, "status" character varying(20) NOT NULL DEFAULT 'OPEN', "resolution_note" text, "verified_by" uuid, "verified_at" TIMESTAMP, "penalty_amount" numeric(18,2) NOT NULL DEFAULT '0', "subcontract_id" character varying, "created_by" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_7cc82aeab8ac44c2a65f98a57c4" UNIQUE ("ncr_code"), CONSTRAINT "PK_ec05ea470544de789747c46bb08" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_afe71393bc08814d562729c2cb" ON "non_conformance_reports" ("project_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_058ec6ca5187216fe701130233" ON "non_conformance_reports" ("category") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7b13501214552870d94426839a" ON "non_conformance_reports" ("status") `,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ADD "project_type" character varying(30) NOT NULL DEFAULT 'CONSTRUCTION'`,
    );
    await queryRunner.query(`ALTER TABLE "projects" ADD "bid_date" date`);
    await queryRunner.query(
      `ALTER TABLE "projects" ADD "bid_result_date" date`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ADD "lost_bid_reason" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ADD "risk_assessment" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ADD "contract_number" character varying(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ADD "contract_value" numeric(18,2)`,
    );
    await queryRunner.query(`ALTER TABLE "projects" ADD "contract_date" date`);
    await queryRunner.query(`ALTER TABLE "projects" ADD "warranty_start" date`);
    await queryRunner.query(`ALTER TABLE "projects" ADD "warranty_end" date`);
    await queryRunner.query(
      `ALTER TABLE "projects" ADD "retention_rate" numeric(5,2) DEFAULT '5'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_9760615d88ed518196bb79ea03d" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "subcontractor_kpis" ADD CONSTRAINT "FK_58ceeaf5171df7e97433af28edd" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "subcontractor_kpis" ADD CONSTRAINT "FK_7d33b6c28fbbd7256d8fc5c80bc" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "subcontractor_kpis" ADD CONSTRAINT "FK_4a65d701b453cf7d2a9814f3b82" FOREIGN KEY ("approved_by") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "ncr_attachments" ADD CONSTRAINT "FK_0cc686a666a8a08b2161deaad84" FOREIGN KEY ("ncr_id") REFERENCES "non_conformance_reports"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "non_conformance_reports" ADD CONSTRAINT "FK_afe71393bc08814d562729c2cbd" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "non_conformance_reports" ADD CONSTRAINT "FK_a6a5a0700bff7e7f99c2c0352c7" FOREIGN KEY ("assigned_to") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "non_conformance_reports" ADD CONSTRAINT "FK_858e1d03fc941f6720e1fac4c28" FOREIGN KEY ("assigned_by") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "non_conformance_reports" ADD CONSTRAINT "FK_55663cc1bc7af531c88173ab3bd" FOREIGN KEY ("verified_by") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "non_conformance_reports" DROP CONSTRAINT "FK_55663cc1bc7af531c88173ab3bd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "non_conformance_reports" DROP CONSTRAINT "FK_858e1d03fc941f6720e1fac4c28"`,
    );
    await queryRunner.query(
      `ALTER TABLE "non_conformance_reports" DROP CONSTRAINT "FK_a6a5a0700bff7e7f99c2c0352c7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "non_conformance_reports" DROP CONSTRAINT "FK_afe71393bc08814d562729c2cbd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ncr_attachments" DROP CONSTRAINT "FK_0cc686a666a8a08b2161deaad84"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subcontractor_kpis" DROP CONSTRAINT "FK_4a65d701b453cf7d2a9814f3b82"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subcontractor_kpis" DROP CONSTRAINT "FK_7d33b6c28fbbd7256d8fc5c80bc"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subcontractor_kpis" DROP CONSTRAINT "FK_58ceeaf5171df7e97433af28edd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "FK_9760615d88ed518196bb79ea03d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" DROP COLUMN "retention_rate"`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" DROP COLUMN "warranty_end"`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" DROP COLUMN "warranty_start"`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" DROP COLUMN "contract_date"`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" DROP COLUMN "contract_value"`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" DROP COLUMN "contract_number"`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" DROP COLUMN "risk_assessment"`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" DROP COLUMN "lost_bid_reason"`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" DROP COLUMN "bid_result_date"`,
    );
    await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "bid_date"`);
    await queryRunner.query(
      `ALTER TABLE "projects" DROP COLUMN "project_type"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7b13501214552870d94426839a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_058ec6ca5187216fe701130233"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_afe71393bc08814d562729c2cb"`,
    );
    await queryRunner.query(`DROP TABLE "non_conformance_reports"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0cc686a666a8a08b2161deaad8"`,
    );
    await queryRunner.query(`DROP TABLE "ncr_attachments"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_58ceeaf5171df7e97433af28ed"`,
    );
    await queryRunner.query(`DROP TABLE "subcontractor_kpis"`);
    await queryRunner.query(`DROP TABLE "work_item_masters"`);
    await queryRunner.query(
      `CREATE INDEX "idx_emp_manager" ON "employees" ("manager_id") WHERE (manager_id IS NOT NULL)`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_emp_code" ON "employees" ("employee_code") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_emp_email" ON "employees" ("email") WHERE (email IS NOT NULL)`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_9760615d88ed518196bb79ea03d" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
