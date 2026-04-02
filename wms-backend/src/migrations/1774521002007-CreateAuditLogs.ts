import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuditLogs1774521002007 implements MigrationInterface {
  name = 'CreateAuditLogs1774521002007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "audit_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "action" character varying(30) NOT NULL, "entity_name" character varying(100) NOT NULL, "entity_id" character varying(100) NOT NULL, "old_data" jsonb, "new_data" jsonb, "changes" jsonb, "actor_id" character varying, "actor_name" character varying(100), "ip_address" character varying(45), "user_agent" character varying(500), "reason" character varying(500), "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_audit_created" ON "audit_logs" ("created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_audit_actor" ON "audit_logs" ("actor_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_audit_entity" ON "audit_logs" ("entity_name", "entity_id") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."idx_audit_entity"`);
    await queryRunner.query(`DROP INDEX "public"."idx_audit_actor"`);
    await queryRunner.query(`DROP INDEX "public"."idx_audit_created"`);
    await queryRunner.query(`DROP TABLE "audit_logs"`);
  }
}
