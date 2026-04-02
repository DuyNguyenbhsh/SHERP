import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPasswordResetTokens1774499823487 implements MigrationInterface {
  name = 'AddPasswordResetTokens1774499823487';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "password_reset_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "token_hash" character varying(64) NOT NULL, "expires_at" TIMESTAMP NOT NULL, "is_used" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d16bebd73e844c48bca50ff8d3d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "FK_52ac39dd8a28730c63aeb428c9c" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "password_reset_tokens" DROP CONSTRAINT "FK_52ac39dd8a28730c63aeb428c9c"`,
    );
    await queryRunner.query(`DROP TABLE "password_reset_tokens"`);
  }
}
