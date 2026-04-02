import { MigrationInterface, QueryRunner } from 'typeorm';

export class AuthSecurityUpgrade1774497778955 implements MigrationInterface {
  name = 'AuthSecurityUpgrade1774497778955';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "project_wbs" DROP CONSTRAINT "FK_project_wbs_parent"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_wbs" DROP CONSTRAINT "FK_project_wbs_project"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_transactions" DROP CONSTRAINT "FK_transaction_wbs"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_settlements" DROP CONSTRAINT "FK_settlement_project"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_settlement_lines" DROP CONSTRAINT "FK_settlement_line"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_boq_imports" DROP CONSTRAINT "FK_boq_import_project"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_boq_items" DROP CONSTRAINT "FK_boq_category"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_boq_items" DROP CONSTRAINT "FK_boq_wbs"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_boq_items" DROP CONSTRAINT "FK_boq_project"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_cbs" DROP CONSTRAINT "FK_cbs_category"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_cbs" DROP CONSTRAINT "FK_cbs_wbs"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_cbs" DROP CONSTRAINT "FK_cbs_project"`,
    );
    await queryRunner.query(
      `ALTER TABLE "approval_config_steps" DROP CONSTRAINT "FK_config_step_config"`,
    );
    await queryRunner.query(
      `ALTER TABLE "approval_requests" DROP CONSTRAINT "FK_request_config"`,
    );
    await queryRunner.query(
      `ALTER TABLE "approval_steps" DROP CONSTRAINT "FK_step_request"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_wbs" DROP CONSTRAINT "UQ_project_wbs_code"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_boq_items" DROP CONSTRAINT "UQ_boq_item_code"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_cbs" DROP CONSTRAINT "UQ_project_cbs"`,
    );
    await queryRunner.query(
      `CREATE TABLE "task_links" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "project_id" character varying NOT NULL, "predecessor_id" character varying NOT NULL, "successor_id" character varying NOT NULL, "link_type" character varying(5) NOT NULL DEFAULT 'FS', "lag_days" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_2f5f44859c9673c258890c43996" UNIQUE ("project_id", "predecessor_id", "successor_id"), CONSTRAINT "PK_c855bf1378b7865b93ff161550b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_tl_project" ON "task_links" ("project_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "schedule_baselines" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "project_id" character varying NOT NULL, "version" integer NOT NULL DEFAULT '1', "title" character varying(255) NOT NULL, "snapshot_data" jsonb NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'DRAFT', "frozen_at" TIMESTAMP, "created_by" character varying NOT NULL, "created_by_name" character varying(100), "approved_by" character varying, "approved_by_name" character varying(100), "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_2d77ee2f0dbeba576b819dd1b75" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "project_tasks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "project_id" character varying NOT NULL, "wbs_id" character varying, "task_code" character varying(30) NOT NULL, "name" character varying(255) NOT NULL, "description" text, "duration_days" integer NOT NULL DEFAULT '1', "start_date" date, "end_date" date, "actual_start" date, "actual_end" date, "progress_percent" numeric(5,2) NOT NULL DEFAULT '0', "status" character varying(20) NOT NULL DEFAULT 'NOT_STARTED', "early_start" integer, "early_finish" integer, "late_start" integer, "late_finish" integer, "total_float" integer, "is_critical" boolean NOT NULL DEFAULT false, "planned_labor" integer NOT NULL DEFAULT '0', "resource_notes" text, "sort_order" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b1b6204912a6f44133df3a4518b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_pt_project" ON "project_tasks" ("project_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "workflow_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "request_id" uuid NOT NULL, "from_status" character varying(30) NOT NULL, "to_status" character varying(30) NOT NULL, "action" character varying(30) NOT NULL, "acted_by" character varying NOT NULL, "acted_by_name" character varying(100), "actor_role" character varying(50), "comment" text, "acted_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d5275bf6bf769463439ab307b42" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "project_requests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "request_code" character varying(30) NOT NULL, "title" character varying(255) NOT NULL, "description" text, "proposed_project_code" character varying(50) NOT NULL, "proposed_project_name" character varying(255) NOT NULL, "location" character varying(255), "gfa_m2" numeric(12,2), "budget" numeric(18,0), "investor_id" character varying, "manager_id" character varying, "department_id" character varying, "proposed_stage" character varying(30) NOT NULL DEFAULT 'PLANNING', "status" character varying(30) NOT NULL DEFAULT 'DRAFT', "created_by" character varying NOT NULL, "created_by_name" character varying(100), "deployed_project_id" character varying, "rejection_reason" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_ac50c1362e42f4a8bf93d827e84" UNIQUE ("request_code"), CONSTRAINT "PK_823e3ef5750d70abfbb943ee4ff" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "project_plans" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "project_id" character varying NOT NULL, "version" integer NOT NULL DEFAULT '1', "title" character varying(255) NOT NULL, "description" text, "planned_start" date, "planned_end" date, "total_budget" numeric(18,0), "plan_data" jsonb, "attachments" jsonb, "status" character varying(20) NOT NULL DEFAULT 'DRAFT', "is_baseline" boolean NOT NULL DEFAULT false, "frozen_at" TIMESTAMP, "created_by" character varying NOT NULL, "created_by_name" character varying(100), "submitted_by" character varying, "submitted_by_name" character varying(100), "reviewed_by" character varying, "reviewed_by_name" character varying(100), "approved_by" character varying, "approved_by_name" character varying(100), "rejection_reason" text, "previous_version_id" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f095cc08244c610430243d8bd8c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "plan_approval_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "plan_id" uuid NOT NULL, "from_status" character varying(20) NOT NULL, "to_status" character varying(20) NOT NULL, "action" character varying(30) NOT NULL, "acted_by" character varying NOT NULL, "acted_by_name" character varying(100), "actor_role" character varying(50), "comment" text, "acted_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_21bce19b5a1036938371994ef2f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "plan_notifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "plan_id" uuid NOT NULL, "project_id" character varying NOT NULL, "recipient_id" character varying NOT NULL, "recipient_name" character varying(100), "notification_type" character varying(50) NOT NULL, "title" character varying(255) NOT NULL, "message" text, "is_read" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6a865cbf93e1703e6a807fd1c96" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "variation_orders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "project_id" character varying NOT NULL, "vo_code" character varying(30) NOT NULL, "title" character varying(255) NOT NULL, "description" text, "vo_type" character varying(20) NOT NULL, "budget_before" numeric(18,0), "budget_after" numeric(18,0), "budget_delta" numeric(18,0), "timeline_before" date, "timeline_after" date, "scope_description" text, "attachments" jsonb, "reason" text NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'DRAFT', "created_by" character varying NOT NULL, "created_by_name" character varying(100), "approved_by" character varying, "approved_by_name" character varying(100), "rejection_reason" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_868ddfbe60464867ff490014fdf" UNIQUE ("vo_code"), CONSTRAINT "PK_45fdd91697ebd3ec104e2186a7e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "project_progress_reports" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "project_id" character varying NOT NULL, "report_period" character varying(30) NOT NULL, "report_date" date NOT NULL, "summary" text, "wbs_progress" jsonb, "evidence_attachments" jsonb, "evidence_notes" text, "overall_progress" numeric(5,2) NOT NULL DEFAULT '0', "earned_value" numeric(18,2) NOT NULL DEFAULT '0', "actual_cost" numeric(18,2) NOT NULL DEFAULT '0', "planned_value" numeric(18,2) NOT NULL DEFAULT '0', "spi" numeric(5,2) NOT NULL DEFAULT '0', "cpi" numeric(5,2) NOT NULL DEFAULT '0', "status" character varying(20) NOT NULL DEFAULT 'DRAFT', "created_by" character varying NOT NULL, "created_by_name" character varying(100), "approved_by" character varying, "approved_by_name" character varying(100), "rejection_reason" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_99f8e64e585eb06ff78fb55a585" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "refresh_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "token_hash" character varying(64) NOT NULL, "device_info" character varying(500), "expires_at" TIMESTAMP NOT NULL, "is_revoked" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "auth_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid, "username_input" character varying(100) NOT NULL, "event" character varying(30) NOT NULL, "ip_address" character varying(45), "user_agent" character varying(500), "failure_reason" character varying(255), "metadata" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f4ee581a4a56f10b64ffbfc1779" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "failed_login_count" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(`ALTER TABLE "users" ADD "locked_until" TIMESTAMP`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "password_changed_at" TIMESTAMP`,
    );
    await queryRunner.query(`ALTER TABLE "users" ADD "password_history" jsonb`);
    await queryRunner.query(
      `ALTER TABLE "project_wbs" DROP COLUMN "department_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_wbs" ADD "department_id" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_transactions" DROP COLUMN "wbs_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_transactions" ADD "wbs_id" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "approval_configs" DROP COLUMN "organization_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "approval_configs" ADD "organization_id" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_wbs" ADD CONSTRAINT "UQ_4179aeea5db4e2f79c34d91ecc9" UNIQUE ("project_id", "code")`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_boq_items" ADD CONSTRAINT "UQ_90194c62bf7e8ec82ea0d089223" UNIQUE ("project_id", "item_code")`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_cbs" ADD CONSTRAINT "UQ_5d068a83e023cdb15df57827b3a" UNIQUE ("project_id", "wbs_id", "category_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_wbs" ADD CONSTRAINT "FK_a3b1d6bbbc1e45d57ff86910d64" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_wbs" ADD CONSTRAINT "FK_a6a742835b1ed40a88038057bfb" FOREIGN KEY ("parent_id") REFERENCES "project_wbs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_settlements" ADD CONSTRAINT "FK_6879e3ec4df43d4c2b1a5506f62" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_settlement_lines" ADD CONSTRAINT "FK_eddcd91ce709cedce7ef92da8ed" FOREIGN KEY ("settlement_id") REFERENCES "project_settlements"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_boq_imports" ADD CONSTRAINT "FK_ac966bec0828f8af47d8a24b9db" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_boq_items" ADD CONSTRAINT "FK_4c1ee373430927026549533ff0b" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_boq_items" ADD CONSTRAINT "FK_816330772b568e0c3220134754d" FOREIGN KEY ("wbs_id") REFERENCES "project_wbs"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_boq_items" ADD CONSTRAINT "FK_ebe65c73d8d5b435cc65e1238bb" FOREIGN KEY ("category_id") REFERENCES "cost_categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_cbs" ADD CONSTRAINT "FK_b6595452d2b36545ae6549dd90f" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_cbs" ADD CONSTRAINT "FK_6d7c931e72cf8bae8e0bfecb488" FOREIGN KEY ("wbs_id") REFERENCES "project_wbs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_cbs" ADD CONSTRAINT "FK_6ad26a59615916c5fd04438a046" FOREIGN KEY ("category_id") REFERENCES "cost_categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_logs" ADD CONSTRAINT "FK_9394142eac09011b1fd54388e82" FOREIGN KEY ("request_id") REFERENCES "project_requests"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "plan_approval_logs" ADD CONSTRAINT "FK_3592655642a6d7c2b4f68d74444" FOREIGN KEY ("plan_id") REFERENCES "project_plans"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "plan_notifications" ADD CONSTRAINT "FK_bc64614e234b5ddbeec4a545cad" FOREIGN KEY ("plan_id") REFERENCES "project_plans"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "auth_logs" ADD CONSTRAINT "FK_99bd49e6f66a26e4bf6bc7c17ba" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "approval_config_steps" ADD CONSTRAINT "FK_4e79dc4b411d40d9b6d93276cfb" FOREIGN KEY ("config_id") REFERENCES "approval_configs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "approval_requests" ADD CONSTRAINT "FK_4d043218b2f68559583788aa534" FOREIGN KEY ("config_id") REFERENCES "approval_configs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "approval_steps" ADD CONSTRAINT "FK_9c166387b7c122e87afbbac3ffc" FOREIGN KEY ("request_id") REFERENCES "approval_requests"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "approval_steps" DROP CONSTRAINT "FK_9c166387b7c122e87afbbac3ffc"`,
    );
    await queryRunner.query(
      `ALTER TABLE "approval_requests" DROP CONSTRAINT "FK_4d043218b2f68559583788aa534"`,
    );
    await queryRunner.query(
      `ALTER TABLE "approval_config_steps" DROP CONSTRAINT "FK_4e79dc4b411d40d9b6d93276cfb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "auth_logs" DROP CONSTRAINT "FK_99bd49e6f66a26e4bf6bc7c17ba"`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "plan_notifications" DROP CONSTRAINT "FK_bc64614e234b5ddbeec4a545cad"`,
    );
    await queryRunner.query(
      `ALTER TABLE "plan_approval_logs" DROP CONSTRAINT "FK_3592655642a6d7c2b4f68d74444"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_logs" DROP CONSTRAINT "FK_9394142eac09011b1fd54388e82"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_cbs" DROP CONSTRAINT "FK_6ad26a59615916c5fd04438a046"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_cbs" DROP CONSTRAINT "FK_6d7c931e72cf8bae8e0bfecb488"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_cbs" DROP CONSTRAINT "FK_b6595452d2b36545ae6549dd90f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_boq_items" DROP CONSTRAINT "FK_ebe65c73d8d5b435cc65e1238bb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_boq_items" DROP CONSTRAINT "FK_816330772b568e0c3220134754d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_boq_items" DROP CONSTRAINT "FK_4c1ee373430927026549533ff0b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_boq_imports" DROP CONSTRAINT "FK_ac966bec0828f8af47d8a24b9db"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_settlement_lines" DROP CONSTRAINT "FK_eddcd91ce709cedce7ef92da8ed"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_settlements" DROP CONSTRAINT "FK_6879e3ec4df43d4c2b1a5506f62"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_wbs" DROP CONSTRAINT "FK_a6a742835b1ed40a88038057bfb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_wbs" DROP CONSTRAINT "FK_a3b1d6bbbc1e45d57ff86910d64"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_cbs" DROP CONSTRAINT "UQ_5d068a83e023cdb15df57827b3a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_boq_items" DROP CONSTRAINT "UQ_90194c62bf7e8ec82ea0d089223"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_wbs" DROP CONSTRAINT "UQ_4179aeea5db4e2f79c34d91ecc9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "approval_configs" DROP COLUMN "organization_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "approval_configs" ADD "organization_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_transactions" DROP COLUMN "wbs_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_transactions" ADD "wbs_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_wbs" DROP COLUMN "department_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_wbs" ADD "department_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "password_history"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "password_changed_at"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "locked_until"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "failed_login_count"`,
    );
    await queryRunner.query(`DROP TABLE "auth_logs"`);
    await queryRunner.query(`DROP TABLE "refresh_tokens"`);
    await queryRunner.query(`DROP TABLE "project_progress_reports"`);
    await queryRunner.query(`DROP TABLE "variation_orders"`);
    await queryRunner.query(`DROP TABLE "plan_notifications"`);
    await queryRunner.query(`DROP TABLE "plan_approval_logs"`);
    await queryRunner.query(`DROP TABLE "project_plans"`);
    await queryRunner.query(`DROP TABLE "project_requests"`);
    await queryRunner.query(`DROP TABLE "workflow_logs"`);
    await queryRunner.query(`DROP INDEX "public"."idx_pt_project"`);
    await queryRunner.query(`DROP TABLE "project_tasks"`);
    await queryRunner.query(`DROP TABLE "schedule_baselines"`);
    await queryRunner.query(`DROP INDEX "public"."idx_tl_project"`);
    await queryRunner.query(`DROP TABLE "task_links"`);
    await queryRunner.query(
      `ALTER TABLE "project_cbs" ADD CONSTRAINT "UQ_project_cbs" UNIQUE ("project_id", "wbs_id", "category_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_boq_items" ADD CONSTRAINT "UQ_boq_item_code" UNIQUE ("project_id", "item_code")`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_wbs" ADD CONSTRAINT "UQ_project_wbs_code" UNIQUE ("project_id", "code")`,
    );
    await queryRunner.query(
      `ALTER TABLE "approval_steps" ADD CONSTRAINT "FK_step_request" FOREIGN KEY ("request_id") REFERENCES "approval_requests"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "approval_requests" ADD CONSTRAINT "FK_request_config" FOREIGN KEY ("config_id") REFERENCES "approval_configs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "approval_config_steps" ADD CONSTRAINT "FK_config_step_config" FOREIGN KEY ("config_id") REFERENCES "approval_configs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_cbs" ADD CONSTRAINT "FK_cbs_project" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_cbs" ADD CONSTRAINT "FK_cbs_wbs" FOREIGN KEY ("wbs_id") REFERENCES "project_wbs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_cbs" ADD CONSTRAINT "FK_cbs_category" FOREIGN KEY ("category_id") REFERENCES "cost_categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_boq_items" ADD CONSTRAINT "FK_boq_project" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_boq_items" ADD CONSTRAINT "FK_boq_wbs" FOREIGN KEY ("wbs_id") REFERENCES "project_wbs"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_boq_items" ADD CONSTRAINT "FK_boq_category" FOREIGN KEY ("category_id") REFERENCES "cost_categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_boq_imports" ADD CONSTRAINT "FK_boq_import_project" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_settlement_lines" ADD CONSTRAINT "FK_settlement_line" FOREIGN KEY ("settlement_id") REFERENCES "project_settlements"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_settlements" ADD CONSTRAINT "FK_settlement_project" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_transactions" ADD CONSTRAINT "FK_transaction_wbs" FOREIGN KEY ("wbs_id") REFERENCES "project_wbs"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_wbs" ADD CONSTRAINT "FK_project_wbs_project" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_wbs" ADD CONSTRAINT "FK_project_wbs_parent" FOREIGN KEY ("parent_id") REFERENCES "project_wbs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
