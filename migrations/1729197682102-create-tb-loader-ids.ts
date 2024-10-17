import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTbLoaderIds1729197682102 implements MigrationInterface {
	name = "CreateTbLoaderIds1729197682102";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`CREATE TABLE "tb_loader_ids" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "reserved" integer, "tb_loader_id" integer, "hex_id" character varying, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "uniq_email" UNIQUE ("email"), CONSTRAINT "pk_id" PRIMARY KEY ("id"))`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		// await queryRunner.query(`DROP TABLE "tb_loader_ids"`);
	}
}
