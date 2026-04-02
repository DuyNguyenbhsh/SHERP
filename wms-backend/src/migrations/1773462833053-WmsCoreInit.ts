import { MigrationInterface, QueryRunner } from 'typeorm';

export class WmsCoreInit1773462833053 implements MigrationInterface {
  name = 'WmsCoreInit1773462833053';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Bảng "outbound_order" (TMS placeholder) đã được tạo bởi InitialSchema — bỏ qua
    await queryRunner.query(
      `CREATE TYPE "public"."outbound_orders_order_type_enum" AS ENUM('SALES_ORDER', 'TRANSFER', 'PRODUCTION', 'RETURN_VENDOR', 'SAMPLE')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."outbound_orders_status_enum" AS ENUM('PENDING', 'ALLOCATED', 'PICKING', 'PICKED', 'PACKING', 'PACKED', 'SHIPPED', 'CANCELED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "outbound_orders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "order_number" character varying NOT NULL, "order_type" "public"."outbound_orders_order_type_enum" NOT NULL DEFAULT 'SALES_ORDER', "status" "public"."outbound_orders_status_enum" NOT NULL DEFAULT 'PENDING', "customer_name" character varying, "customer_phone" character varying, "delivery_address" text, "reference_code" character varying, "warehouse_code" character varying, "required_date" date, "assigned_to" character varying, "total_weight" numeric(10,2) NOT NULL DEFAULT '0', "notes" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_b62424054b5ed9dd1a9ed25baea" UNIQUE ("order_number"), CONSTRAINT "PK_993dc15b5f4f83e6c4e2e2e6878" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."outbound_lines_pick_status_enum" AS ENUM('PENDING', 'PARTIAL', 'PICKED', 'SHORT')`,
    );
    await queryRunner.query(
      `CREATE TABLE "outbound_lines" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "product_id" character varying NOT NULL, "requested_qty" integer NOT NULL, "allocated_qty" integer NOT NULL DEFAULT '0', "picked_qty" integer NOT NULL DEFAULT '0', "packed_qty" integer NOT NULL DEFAULT '0', "pick_status" "public"."outbound_lines_pick_status_enum" NOT NULL DEFAULT 'PENDING', "pick_location_id" character varying, "lot_number" character varying, "notes" text, "outbound_order_id" uuid, CONSTRAINT "PK_ef8140b299383b9acde9c8475cb" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."locations_location_type_enum" AS ENUM('WAREHOUSE', 'ZONE', 'AISLE', 'BIN', 'STAGING', 'QC_AREA')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."locations_status_enum" AS ENUM('ACTIVE', 'FULL', 'BLOCKED', 'INACTIVE')`,
    );
    await queryRunner.query(
      `CREATE TABLE "locations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying(50) NOT NULL, "name" character varying(255) NOT NULL, "barcode" character varying(100), "location_type" "public"."locations_location_type_enum" NOT NULL DEFAULT 'BIN', "status" "public"."locations_status_enum" NOT NULL DEFAULT 'ACTIVE', "max_capacity" integer NOT NULL DEFAULT '0', "current_qty" integer NOT NULL DEFAULT '0', "warehouse_code" character varying(50), "notes" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "parent_id" uuid, CONSTRAINT "UQ_1c65ef243169e51b514c814eeae" UNIQUE ("code"), CONSTRAINT "UQ_d1960eb07b1947e49bfc686df79" UNIQUE ("barcode"), CONSTRAINT "PK_7cc1c9e3853b94816c094825e74" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."inventory_items_status_enum" AS ENUM('AVAILABLE', 'RESERVED', 'IN_TRANSIT', 'QUARANTINE', 'DAMAGED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "inventory_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "product_id" character varying NOT NULL, "location_id" uuid, "qty_on_hand" integer NOT NULL DEFAULT '0', "qty_reserved" integer NOT NULL DEFAULT '0', "status" "public"."inventory_items_status_enum" NOT NULL DEFAULT 'AVAILABLE', "lot_number" character varying(100), "serial_number" character varying(100), "inbound_receipt_id" character varying, "warehouse_code" character varying(50), "notes" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_cf2f451407242e132547ac19169" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_INV_PRODUCT_STATUS" ON "inventory_items" ("product_id", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_INV_PRODUCT_LOCATION_LOT" ON "inventory_items" ("product_id", "location_id", "lot_number") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."inbound_lines_qc_status_enum" AS ENUM('PENDING', 'PASSED', 'FAILED', 'PARTIAL')`,
    );
    await queryRunner.query(
      `CREATE TABLE "inbound_lines" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "product_id" character varying NOT NULL, "expected_qty" integer NOT NULL, "received_qty" integer NOT NULL DEFAULT '0', "accepted_qty" integer NOT NULL DEFAULT '0', "rejected_qty" integer NOT NULL DEFAULT '0', "qc_status" "public"."inbound_lines_qc_status_enum" NOT NULL DEFAULT 'PENDING', "putaway_location" character varying, "lot_number" character varying, "notes" text, "inbound_receipt_id" uuid, CONSTRAINT "PK_fcc638c756dc61cec1ed981cea3" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."inbound_receipts_receipt_type_enum" AS ENUM('PO_RECEIPT', 'RETURN', 'TRANSFER', 'ADJUSTMENT')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."inbound_receipts_status_enum" AS ENUM('PENDING', 'INSPECTING', 'PUTAWAY', 'COMPLETED', 'REJECTED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "inbound_receipts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "receipt_number" character varying NOT NULL, "receipt_type" "public"."inbound_receipts_receipt_type_enum" NOT NULL DEFAULT 'PO_RECEIPT', "status" "public"."inbound_receipts_status_enum" NOT NULL DEFAULT 'PENDING', "po_id" character varying, "grn_id" character varying, "warehouse_code" character varying, "dock_number" character varying, "received_by" character varying, "notes" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_7f67dad036cddaac051758f5df3" UNIQUE ("receipt_number"), CONSTRAINT "PK_ff477de78db04da2d512a764a77" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "outbound_lines" ADD CONSTRAINT "FK_3806c8094e50ab8f83ce24f5f91" FOREIGN KEY ("outbound_order_id") REFERENCES "outbound_orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "locations" ADD CONSTRAINT "FK_ce8370570fc9bb582e9510b94a0" FOREIGN KEY ("parent_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_items" ADD CONSTRAINT "FK_45ed0784af22d38041d680da269" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "inbound_lines" ADD CONSTRAINT "FK_a76b5da2323149d6c49d03507dd" FOREIGN KEY ("inbound_receipt_id") REFERENCES "inbound_receipts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "inbound_lines" DROP CONSTRAINT "FK_a76b5da2323149d6c49d03507dd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_items" DROP CONSTRAINT "FK_45ed0784af22d38041d680da269"`,
    );
    await queryRunner.query(
      `ALTER TABLE "locations" DROP CONSTRAINT "FK_ce8370570fc9bb582e9510b94a0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "outbound_lines" DROP CONSTRAINT "FK_3806c8094e50ab8f83ce24f5f91"`,
    );
    await queryRunner.query(`DROP TABLE "inbound_receipts"`);
    await queryRunner.query(
      `DROP TYPE "public"."inbound_receipts_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."inbound_receipts_receipt_type_enum"`,
    );
    await queryRunner.query(`DROP TABLE "inbound_lines"`);
    await queryRunner.query(
      `DROP TYPE "public"."inbound_lines_qc_status_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_INV_PRODUCT_LOCATION_LOT"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_INV_PRODUCT_STATUS"`);
    await queryRunner.query(`DROP TABLE "inventory_items"`);
    await queryRunner.query(`DROP TYPE "public"."inventory_items_status_enum"`);
    await queryRunner.query(`DROP TABLE "locations"`);
    await queryRunner.query(`DROP TYPE "public"."locations_status_enum"`);
    await queryRunner.query(
      `DROP TYPE "public"."locations_location_type_enum"`,
    );
    await queryRunner.query(`DROP TABLE "outbound_lines"`);
    await queryRunner.query(
      `DROP TYPE "public"."outbound_lines_pick_status_enum"`,
    );
    await queryRunner.query(`DROP TABLE "outbound_orders"`);
    await queryRunner.query(`DROP TYPE "public"."outbound_orders_status_enum"`);
    await queryRunner.query(
      `DROP TYPE "public"."outbound_orders_order_type_enum"`,
    );
    // Bảng "outbound_order" (TMS placeholder) thuộc InitialSchema — không drop ở đây
  }
}
