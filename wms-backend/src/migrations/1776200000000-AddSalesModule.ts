import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Sales Module (O2C) — Customers + Quotes + SalesOrders
 * - 5 tables: customers, sales_quotes, sales_quote_lines, sales_orders, sales_order_lines
 * - FK RESTRICT customer để tránh xoá khách có lịch sử SO
 * - FK CASCADE lines
 */
export class AddSalesModule1776200000000 implements MigrationInterface {
  name = 'AddSalesModule1776200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Enums ──
    await queryRunner.query(`
      CREATE TYPE "customers_customer_type_enum" AS ENUM
        ('INDIVIDUAL', 'CORPORATE', 'WHOLESALE', 'RETAIL')
    `);
    await queryRunner.query(`
      CREATE TYPE "customers_payment_term_enum" AS ENUM
        ('COD', 'NET15', 'NET30', 'EOM', 'PREPAY')
    `);
    await queryRunner.query(`
      CREATE TYPE "sales_quotes_status_enum" AS ENUM
        ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED')
    `);
    await queryRunner.query(`
      CREATE TYPE "sales_orders_status_enum" AS ENUM
        ('CONFIRMED', 'FULFILLING', 'DELIVERED', 'CANCELED')
    `);
    await queryRunner.query(`
      CREATE TYPE "sales_orders_payment_term_enum" AS ENUM
        ('COD', 'NET15', 'NET30', 'EOM', 'PREPAY')
    `);

    // ── customers ──
    await queryRunner.query(`
      CREATE TABLE "customers" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "customer_code" varchar(50) NOT NULL,
        "name" varchar(255) NOT NULL,
        "short_name" varchar(100),
        "tax_code" varchar(50),
        "customer_type" "customers_customer_type_enum" NOT NULL DEFAULT 'RETAIL',
        "primary_contact" varchar(255),
        "primary_phone" varchar(50),
        "primary_email" varchar(150),
        "billing_address" text,
        "shipping_address" text,
        "payment_term" "customers_payment_term_enum" NOT NULL DEFAULT 'COD',
        "credit_limit" decimal(15,2) NOT NULL DEFAULT 0,
        "current_debt" decimal(15,2) NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        "is_blacklisted" boolean NOT NULL DEFAULT false,
        "notes" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "version" integer NOT NULL DEFAULT 1,
        CONSTRAINT "PK_customers" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_customers_code" ON "customers"("customer_code")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_customers_name" ON "customers"("name")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_customers_tax_code" ON "customers"("tax_code") WHERE "tax_code" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_customers_active_type" ON "customers"("is_active", "customer_type")`,
    );

    // ── sales_quotes ──
    await queryRunner.query(`
      CREATE TABLE "sales_quotes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "quote_number" varchar(50) NOT NULL,
        "customer_id" uuid NOT NULL,
        "status" "sales_quotes_status_enum" NOT NULL DEFAULT 'DRAFT',
        "effective_date" date NOT NULL,
        "expiry_date" date NOT NULL,
        "total_subtotal" decimal(15,2) NOT NULL DEFAULT 0,
        "total_discount" decimal(15,2) NOT NULL DEFAULT 0,
        "total_tax" decimal(15,2) NOT NULL DEFAULT 0,
        "grand_total" decimal(15,2) NOT NULL DEFAULT 0,
        "converted_to_so_id" uuid,
        "sales_rep_id" uuid,
        "notes" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sales_quotes" PRIMARY KEY ("id"),
        CONSTRAINT "FK_quotes_customer" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_quotes_number" ON "sales_quotes"("quote_number")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_quotes_customer_status" ON "sales_quotes"("customer_id", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_quotes_status_expiry" ON "sales_quotes"("status", "expiry_date")`,
    );

    // ── sales_quote_lines ──
    await queryRunner.query(`
      CREATE TABLE "sales_quote_lines" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "quote_id" uuid NOT NULL,
        "product_id" uuid NOT NULL,
        "qty" integer NOT NULL,
        "unit_price" decimal(12,2) NOT NULL,
        "discount_percent" decimal(5,2) NOT NULL DEFAULT 0,
        "tax_percent" decimal(5,2) NOT NULL DEFAULT 10,
        "line_subtotal" decimal(15,2) NOT NULL DEFAULT 0,
        "line_discount" decimal(15,2) NOT NULL DEFAULT 0,
        "line_tax" decimal(15,2) NOT NULL DEFAULT 0,
        "line_total" decimal(15,2) NOT NULL DEFAULT 0,
        "notes" text,
        CONSTRAINT "PK_sales_quote_lines" PRIMARY KEY ("id"),
        CONSTRAINT "FK_quote_lines_quote" FOREIGN KEY ("quote_id") REFERENCES "sales_quotes"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_quote_lines_quote" ON "sales_quote_lines"("quote_id")`,
    );

    // ── sales_orders ──
    await queryRunner.query(`
      CREATE TABLE "sales_orders" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "order_number" varchar(50) NOT NULL,
        "customer_id" uuid NOT NULL,
        "quote_id" uuid,
        "status" "sales_orders_status_enum" NOT NULL DEFAULT 'CONFIRMED',
        "outbound_order_id" uuid,
        "order_date" TIMESTAMP NOT NULL DEFAULT now(),
        "required_delivery_date" date,
        "ship_to_address" text,
        "payment_term" "sales_orders_payment_term_enum" NOT NULL DEFAULT 'COD',
        "total_subtotal" decimal(15,2) NOT NULL DEFAULT 0,
        "total_discount" decimal(15,2) NOT NULL DEFAULT 0,
        "total_tax" decimal(15,2) NOT NULL DEFAULT 0,
        "grand_total" decimal(15,2) NOT NULL DEFAULT 0,
        "is_credit_bypassed" boolean NOT NULL DEFAULT false,
        "bypass_reason" text,
        "sales_rep_id" uuid,
        "notes" text,
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "version" integer NOT NULL DEFAULT 1,
        CONSTRAINT "PK_sales_orders" PRIMARY KEY ("id"),
        CONSTRAINT "FK_orders_customer" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_orders_number" ON "sales_orders"("order_number")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_orders_customer_status" ON "sales_orders"("customer_id", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_orders_status_date" ON "sales_orders"("status", "order_date")`,
    );

    // ── sales_order_lines ──
    await queryRunner.query(`
      CREATE TABLE "sales_order_lines" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "sales_order_id" uuid NOT NULL,
        "product_id" uuid NOT NULL,
        "qty" integer NOT NULL,
        "qty_fulfilled" integer NOT NULL DEFAULT 0,
        "unit_price" decimal(12,2) NOT NULL,
        "discount_percent" decimal(5,2) NOT NULL DEFAULT 0,
        "tax_percent" decimal(5,2) NOT NULL DEFAULT 10,
        "line_subtotal" decimal(15,2) NOT NULL DEFAULT 0,
        "line_discount" decimal(15,2) NOT NULL DEFAULT 0,
        "line_tax" decimal(15,2) NOT NULL DEFAULT 0,
        "line_total" decimal(15,2) NOT NULL DEFAULT 0,
        "notes" text,
        CONSTRAINT "PK_sales_order_lines" PRIMARY KEY ("id"),
        CONSTRAINT "FK_order_lines_order" FOREIGN KEY ("sales_order_id") REFERENCES "sales_orders"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_order_lines_order" ON "sales_order_lines"("sales_order_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "sales_order_lines"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sales_orders"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sales_quote_lines"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sales_quotes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "customers"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "sales_orders_payment_term_enum"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "sales_orders_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "sales_quotes_status_enum"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "customers_payment_term_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "customers_customer_type_enum"`,
    );
  }
}
