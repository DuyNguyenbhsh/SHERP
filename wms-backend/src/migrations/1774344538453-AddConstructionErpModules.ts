import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddConstructionErpModules1774344538453 implements MigrationInterface {
  name = 'AddConstructionErpModules1774344538453';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ════════════════════════════════════════════════
    // TASK 1: WBS & CBS
    // ════════════════════════════════════════════════

    await queryRunner.query(`
      CREATE TABLE "project_wbs" (
        "id"               uuid DEFAULT uuid_generate_v4() NOT NULL,
        "project_id"       uuid NOT NULL,
        "parent_id"        uuid,
        "code"             varchar(50) NOT NULL,
        "name"             varchar(255) NOT NULL,
        "level"            int NOT NULL DEFAULT 0,
        "path"             text,
        "sort_order"       int NOT NULL DEFAULT 0,
        "planned_start"    date,
        "planned_end"      date,
        "actual_start"     date,
        "actual_end"       date,
        "weight"           decimal(5,2) NOT NULL DEFAULT 0,
        "progress_percent" decimal(5,2) NOT NULL DEFAULT 0,
        "status"           varchar(30) NOT NULL DEFAULT 'PENDING',
        "department_id"    uuid,
        "description"      text,
        "created_at"       TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at"       TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_project_wbs" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_project_wbs_code" UNIQUE ("project_id", "code"),
        CONSTRAINT "FK_project_wbs_project" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_project_wbs_parent" FOREIGN KEY ("parent_id") REFERENCES "project_wbs"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_wbs_project_id" ON "project_wbs" ("project_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_wbs_parent_id" ON "project_wbs" ("parent_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "project_cbs" (
        "id"              uuid DEFAULT uuid_generate_v4() NOT NULL,
        "project_id"      uuid NOT NULL,
        "wbs_id"          uuid NOT NULL,
        "category_id"     uuid NOT NULL,
        "planned_amount"  decimal(18,2) NOT NULL DEFAULT 0,
        "currency"        varchar(10) NOT NULL DEFAULT 'VND',
        "notes"           text,
        "created_at"      TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at"      TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_project_cbs" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_project_cbs" UNIQUE ("project_id", "wbs_id", "category_id"),
        CONSTRAINT "FK_cbs_project" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_cbs_wbs" FOREIGN KEY ("wbs_id") REFERENCES "project_wbs"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_cbs_category" FOREIGN KEY ("category_id") REFERENCES "cost_categories"("id") ON DELETE CASCADE
      )
    `);

    // ════════════════════════════════════════════════
    // TASK 2: BOQ & Material Quotas
    // ════════════════════════════════════════════════

    await queryRunner.query(`
      CREATE TABLE "project_boq_items" (
        "id"           uuid DEFAULT uuid_generate_v4() NOT NULL,
        "project_id"   uuid NOT NULL,
        "wbs_id"       uuid,
        "item_code"    varchar(50) NOT NULL,
        "item_name"    varchar(255) NOT NULL,
        "unit"         varchar(30) NOT NULL,
        "quantity"     decimal(15,4) NOT NULL DEFAULT 0,
        "unit_price"   decimal(18,2) NOT NULL DEFAULT 0,
        "total_price"  decimal(18,2) NOT NULL DEFAULT 0,
        "product_id"   varchar,
        "category_id"  uuid,
        "issued_qty"   decimal(15,4) NOT NULL DEFAULT 0,
        "notes"        text,
        "sort_order"   int NOT NULL DEFAULT 0,
        "created_at"   TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at"   TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_project_boq_items" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_boq_item_code" UNIQUE ("project_id", "item_code"),
        CONSTRAINT "FK_boq_project" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_boq_wbs" FOREIGN KEY ("wbs_id") REFERENCES "project_wbs"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_boq_category" FOREIGN KEY ("category_id") REFERENCES "cost_categories"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_boq_project_wbs" ON "project_boq_items" ("project_id", "wbs_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "project_boq_imports" (
        "id"           uuid DEFAULT uuid_generate_v4() NOT NULL,
        "project_id"   uuid NOT NULL,
        "file_name"    varchar(255) NOT NULL,
        "total_rows"   int NOT NULL DEFAULT 0,
        "success_rows" int NOT NULL DEFAULT 0,
        "error_rows"   int NOT NULL DEFAULT 0,
        "errors"       jsonb,
        "imported_by"  varchar,
        "imported_at"  TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_project_boq_imports" PRIMARY KEY ("id"),
        CONSTRAINT "FK_boq_import_project" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE
      )
    `);

    // Thêm project_id, wbs_id vào outbound_orders (loose FK)
    await queryRunner.query(
      `ALTER TABLE "outbound_orders" ADD "project_id" varchar`,
    );
    await queryRunner.query(
      `ALTER TABLE "outbound_orders" ADD "wbs_id" varchar`,
    );

    // ════════════════════════════════════════════════
    // TASK 3: EVM — thêm wbs_id vào project_transactions
    // ════════════════════════════════════════════════

    await queryRunner.query(
      `ALTER TABLE "project_transactions" ADD "wbs_id" uuid`,
    );
    await queryRunner.query(`
      ALTER TABLE "project_transactions"
      ADD CONSTRAINT "FK_transaction_wbs" FOREIGN KEY ("wbs_id") REFERENCES "project_wbs"("id") ON DELETE SET NULL
    `);

    // ════════════════════════════════════════════════
    // TASK 4: Approval Workflow
    // ════════════════════════════════════════════════

    await queryRunner.query(`
      CREATE TABLE "approval_configs" (
        "id"              uuid DEFAULT uuid_generate_v4() NOT NULL,
        "organization_id" uuid,
        "entity_type"     varchar(50) NOT NULL,
        "name"            varchar(255) NOT NULL,
        "is_active"       boolean NOT NULL DEFAULT true,
        "conditions"      jsonb,
        "created_at"      TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at"      TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_approval_configs" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "approval_config_steps" (
        "id"             uuid DEFAULT uuid_generate_v4() NOT NULL,
        "config_id"      uuid NOT NULL,
        "step_order"     int NOT NULL,
        "approver_role"  varchar(50),
        "approver_id"    varchar,
        "is_required"    boolean NOT NULL DEFAULT true,
        "timeout_hours"  int,
        "created_at"     TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_approval_config_steps" PRIMARY KEY ("id"),
        CONSTRAINT "FK_config_step_config" FOREIGN KEY ("config_id") REFERENCES "approval_configs"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "approval_requests" (
        "id"            uuid DEFAULT uuid_generate_v4() NOT NULL,
        "config_id"     uuid NOT NULL,
        "entity_type"   varchar(50) NOT NULL,
        "entity_id"     varchar NOT NULL,
        "status"        varchar(30) NOT NULL DEFAULT 'PENDING',
        "requested_by"  varchar NOT NULL,
        "request_data"  jsonb NOT NULL,
        "current_step"  int NOT NULL DEFAULT 1,
        "resolved_at"   TIMESTAMP,
        "created_at"    TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at"    TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_approval_requests" PRIMARY KEY ("id"),
        CONSTRAINT "FK_request_config" FOREIGN KEY ("config_id") REFERENCES "approval_configs"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "approval_steps" (
        "id"           uuid DEFAULT uuid_generate_v4() NOT NULL,
        "request_id"   uuid NOT NULL,
        "step_order"   int NOT NULL,
        "approver_id"  varchar NOT NULL,
        "status"       varchar(30) NOT NULL DEFAULT 'PENDING',
        "comment"      text,
        "acted_at"     TIMESTAMP,
        "created_at"   TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_approval_steps" PRIMARY KEY ("id"),
        CONSTRAINT "FK_step_request" FOREIGN KEY ("request_id") REFERENCES "approval_requests"("id") ON DELETE CASCADE
      )
    `);

    // ════════════════════════════════════════════════
    // TASK 5: Settlement / Reconciliation
    // ════════════════════════════════════════════════

    await queryRunner.query(`
      CREATE TABLE "project_settlements" (
        "id"                  uuid DEFAULT uuid_generate_v4() NOT NULL,
        "project_id"          uuid NOT NULL,
        "settlement_date"     date NOT NULL,
        "status"              varchar(30) NOT NULL DEFAULT 'DRAFT',
        "total_material_in"   decimal(18,2) NOT NULL DEFAULT 0,
        "total_material_out"  decimal(18,2) NOT NULL DEFAULT 0,
        "on_site_stock_value" decimal(18,2) NOT NULL DEFAULT 0,
        "variance"            decimal(18,2) NOT NULL DEFAULT 0,
        "variance_percent"    decimal(5,2) NOT NULL DEFAULT 0,
        "notes"               text,
        "settled_by"          varchar,
        "created_at"          TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at"          TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_project_settlements" PRIMARY KEY ("id"),
        CONSTRAINT "FK_settlement_project" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "project_settlement_lines" (
        "id"             uuid DEFAULT uuid_generate_v4() NOT NULL,
        "settlement_id"  uuid NOT NULL,
        "product_id"     varchar NOT NULL,
        "product_name"   varchar(255) NOT NULL,
        "unit"           varchar(30) NOT NULL,
        "qty_issued"     decimal(15,4) NOT NULL DEFAULT 0,
        "qty_returned"   decimal(15,4) NOT NULL DEFAULT 0,
        "qty_on_site"    decimal(15,4) NOT NULL DEFAULT 0,
        "qty_variance"   decimal(15,4) NOT NULL DEFAULT 0,
        "unit_price"     decimal(18,2) NOT NULL DEFAULT 0,
        "value_variance" decimal(18,2) NOT NULL DEFAULT 0,
        "notes"          text,
        CONSTRAINT "PK_project_settlement_lines" PRIMARY KEY ("id"),
        CONSTRAINT "FK_settlement_line" FOREIGN KEY ("settlement_id") REFERENCES "project_settlements"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "project_settlement_lines"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "project_settlements"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "approval_steps"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "approval_requests"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "approval_config_steps"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "approval_configs"`);
    await queryRunner.query(
      `ALTER TABLE "project_transactions" DROP CONSTRAINT IF EXISTS "FK_transaction_wbs"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_transactions" DROP COLUMN IF EXISTS "wbs_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "outbound_orders" DROP COLUMN IF EXISTS "wbs_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "outbound_orders" DROP COLUMN IF EXISTS "project_id"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "project_boq_imports"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "project_boq_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "project_cbs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "project_wbs"`);
  }
}
