import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjectTransactions1774282598405 implements MigrationInterface {
  name = 'AddProjectTransactions1774282598405';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "project_transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "project_id" uuid NOT NULL, "cbs_category" character varying(30) NOT NULL, "description" character varying(255) NOT NULL, "amount" numeric(15,2) NOT NULL, "transaction_date" date NOT NULL, "vendor" character varying(100), "reference_no" character varying(100), "notes" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b6870753b30b2c6695b7a379aa5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_transactions" ADD CONSTRAINT "FK_83e5080bcd053981d11775216fc" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "project_transactions" DROP CONSTRAINT "FK_83e5080bcd053981d11775216fc"`,
    );
    await queryRunner.query(`DROP TABLE "project_transactions"`);
  }
}
