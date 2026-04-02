import { MigrationInterface, QueryRunner } from 'typeorm';

export class RefactorCostManagement1774283224313 implements MigrationInterface {
  name = 'RefactorCostManagement1774283224313';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "cost_categories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying(20) NOT NULL, "name" character varying(100) NOT NULL, "description" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_8a6ea00c08487bf8ff34a147b6b" UNIQUE ("code"), CONSTRAINT "PK_7a64898fa80f0cd6ec029d227d0" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "project_budgets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "project_id" uuid NOT NULL, "category_id" uuid NOT NULL, "planned_amount" numeric(18,2) NOT NULL DEFAULT '0', "currency" character varying(10) NOT NULL DEFAULT 'VND', "notes" text, CONSTRAINT "UQ_afa2d5721be8ea52697f3b490ec" UNIQUE ("project_id", "category_id"), CONSTRAINT "PK_b3eae5bf0f13c967da41770b8fc" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_transactions" DROP COLUMN "cbs_category"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_transactions" DROP COLUMN "reference_no"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_transactions" DROP COLUMN "notes"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_transactions" DROP COLUMN "vendor"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_transactions" ADD "category_id" uuid NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_transactions" ADD "reference_type" character varying(50)`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_transactions" ADD "reference_id" character varying(50)`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_transactions" ALTER COLUMN "amount" TYPE numeric(18,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_transactions" DROP COLUMN "description"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_transactions" ADD "description" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_transactions" ADD CONSTRAINT "FK_2f73634039338dfb4e62f5a7ac4" FOREIGN KEY ("category_id") REFERENCES "cost_categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_budgets" ADD CONSTRAINT "FK_fa8f2a72a3c21da4d55045ca7ca" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_budgets" ADD CONSTRAINT "FK_25b4a248bc005de1df072a2f5f0" FOREIGN KEY ("category_id") REFERENCES "cost_categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "project_budgets" DROP CONSTRAINT "FK_25b4a248bc005de1df072a2f5f0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_budgets" DROP CONSTRAINT "FK_fa8f2a72a3c21da4d55045ca7ca"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_transactions" DROP CONSTRAINT "FK_2f73634039338dfb4e62f5a7ac4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_transactions" DROP COLUMN "description"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_transactions" ADD "description" character varying(255) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_transactions" ALTER COLUMN "amount" TYPE numeric(15,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_transactions" DROP COLUMN "reference_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_transactions" DROP COLUMN "reference_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_transactions" DROP COLUMN "category_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_transactions" ADD "vendor" character varying(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_transactions" ADD "notes" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_transactions" ADD "reference_no" character varying(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_transactions" ADD "cbs_category" character varying(30) NOT NULL`,
    );
    await queryRunner.query(`DROP TABLE "project_budgets"`);
    await queryRunner.query(`DROP TABLE "cost_categories"`);
  }
}
