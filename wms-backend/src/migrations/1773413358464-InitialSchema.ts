import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1773413358464 implements MigrationInterface {
  name = 'InitialSchema1773413358464';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "outbound_order" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "orderCode" character varying NOT NULL, "customerName" character varying NOT NULL, "deliveryAddress" character varying NOT NULL, "totalWeight" double precision NOT NULL DEFAULT '0', "status" character varying NOT NULL DEFAULT 'PENDING', CONSTRAINT "PK_a2dae73882b32d50cdabea6bbb6" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "outbound_order"`);
  }
}
