import { MigrationInterface, QueryRunner } from 'typeorm';

export class TmsWaybillIntegration1773497404578 implements MigrationInterface {
  name = 'TmsWaybillIntegration1773497404578';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."waybills_status_enum" AS ENUM('DRAFT', 'READY_TO_PICK', 'IN_TRANSIT', 'DELIVERED', 'CANCELED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."waybills_cod_status_enum" AS ENUM('PENDING', 'COLLECTED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "waybills" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "waybill_code" character varying NOT NULL, "status" "public"."waybills_status_enum" NOT NULL DEFAULT 'DRAFT', "vehicle_id" uuid, "cod_amount" numeric(15,2) NOT NULL DEFAULT '0', "cod_status" "public"."waybills_cod_status_enum" NOT NULL DEFAULT 'PENDING', "weight" integer, "shipping_fee" numeric(12,2), "provider_id" character varying, "driver_name" character varying, "notes" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_4f5a10e82dd2a18029320d3762b" UNIQUE ("waybill_code"), CONSTRAINT "PK_38b1c7d5ec2d0183970dd279134" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "outbound_orders" ADD "waybill_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."outbound_orders_status_enum" RENAME TO "outbound_orders_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."outbound_orders_status_enum" AS ENUM('PENDING', 'ALLOCATED', 'PICKING', 'PICKED', 'PACKING', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "outbound_orders" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "outbound_orders" ALTER COLUMN "status" TYPE "public"."outbound_orders_status_enum" USING "status"::"text"::"public"."outbound_orders_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "outbound_orders" ALTER COLUMN "status" SET DEFAULT 'PENDING'`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."outbound_orders_status_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "outbound_orders" ADD CONSTRAINT "FK_6a9e2159479eca85d7121a67c32" FOREIGN KEY ("waybill_id") REFERENCES "waybills"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "waybills" ADD CONSTRAINT "FK_169c4d98db3a661f5b5c9db99a1" FOREIGN KEY ("vehicle_id") REFERENCES "vehicle"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "waybills" DROP CONSTRAINT "FK_169c4d98db3a661f5b5c9db99a1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "outbound_orders" DROP CONSTRAINT "FK_6a9e2159479eca85d7121a67c32"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."outbound_orders_status_enum_old" AS ENUM('PENDING', 'ALLOCATED', 'PICKING', 'PICKED', 'PACKING', 'PACKED', 'SHIPPED', 'CANCELED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "outbound_orders" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "outbound_orders" ALTER COLUMN "status" TYPE "public"."outbound_orders_status_enum_old" USING "status"::"text"::"public"."outbound_orders_status_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "outbound_orders" ALTER COLUMN "status" SET DEFAULT 'PENDING'`,
    );
    await queryRunner.query(`DROP TYPE "public"."outbound_orders_status_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."outbound_orders_status_enum_old" RENAME TO "outbound_orders_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "outbound_orders" DROP COLUMN "waybill_id"`,
    );
    await queryRunner.query(`DROP TABLE "waybills"`);
    await queryRunner.query(`DROP TYPE "public"."waybills_cod_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."waybills_status_enum"`);
  }
}
