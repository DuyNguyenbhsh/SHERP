import { MigrationInterface, QueryRunner } from 'typeorm';

export class CleanupTmsOutboundPlaceholder1773464156133 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Xóa bảng placeholder "outbound_order" (TMS) — đã thay thế bởi bảng "outbound_orders" (WMS)
    await queryRunner.query(`DROP TABLE IF EXISTS "outbound_order"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Khôi phục bảng placeholder nếu cần rollback
    await queryRunner.query(
      `CREATE TABLE "outbound_order" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "orderCode" character varying NOT NULL, "customerName" character varying NOT NULL, "deliveryAddress" character varying NOT NULL, "totalWeight" double precision NOT NULL DEFAULT '0', "status" character varying NOT NULL DEFAULT 'PENDING', CONSTRAINT "PK_outbound_order_placeholder" PRIMARY KEY ("id"))`,
    );
  }
}
