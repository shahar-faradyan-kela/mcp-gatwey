import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1700000000000 implements MigrationInterface {
  name = 'InitialSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enums
    await queryRunner.query(
      `CREATE TYPE "mcp_servers_auth_type_enum" AS ENUM('none', 'bearer', 'api_key')`,
    );
    await queryRunner.query(
      `CREATE TYPE "mcp_servers_status_enum" AS ENUM('UP', 'DOWN', 'UNKNOWN')`,
    );
    await queryRunner.query(
      `CREATE TYPE "request_logs_status_enum" AS ENUM('success', 'error')`,
    );

    // Create mcp_servers table
    await queryRunner.query(`
      CREATE TABLE "mcp_servers" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying(255) NOT NULL,
        "alias" character varying(100) NOT NULL,
        "url" text NOT NULL,
        "description" text,
        "tags" text[] NOT NULL DEFAULT '{}',
        "authType" "mcp_servers_auth_type_enum" NOT NULL DEFAULT 'none',
        "authCredentialsEncrypted" text,
        "isEnabled" boolean NOT NULL DEFAULT true,
        "status" "mcp_servers_status_enum" NOT NULL DEFAULT 'UNKNOWN',
        "lastCheckedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_mcp_servers" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_mcp_servers_alias" UNIQUE ("alias")
      )
    `);

    // Create request_logs table
    await queryRunner.query(`
      CREATE TABLE "request_logs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "toolName" character varying(255) NOT NULL,
        "serverAlias" character varying(100) NOT NULL,
        "server_id" uuid,
        "latencyMs" integer NOT NULL,
        "status" "request_logs_status_enum" NOT NULL,
        "errorMessage" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_request_logs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_request_logs_server" FOREIGN KEY ("server_id")
          REFERENCES "mcp_servers"("id") ON DELETE SET NULL ON UPDATE NO ACTION
      )
    `);

    // Create indexes for efficient Admin UI log queries
    await queryRunner.query(
      `CREATE INDEX "IDX_request_logs_created_at" ON "request_logs" ("createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_request_logs_server_id" ON "request_logs" ("server_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_request_logs_server_id"`);
    await queryRunner.query(`DROP INDEX "IDX_request_logs_created_at"`);
    await queryRunner.query(`DROP TABLE "request_logs"`);
    await queryRunner.query(`DROP TABLE "mcp_servers"`);
    await queryRunner.query(`DROP TYPE "request_logs_status_enum"`);
    await queryRunner.query(`DROP TYPE "mcp_servers_status_enum"`);
    await queryRunner.query(`DROP TYPE "mcp_servers_auth_type_enum"`);
  }
}
