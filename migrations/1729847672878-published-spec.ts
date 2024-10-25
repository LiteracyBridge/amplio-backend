import { MigrationInterface, QueryRunner } from "typeorm";

export class PublishedSpec1729847672878 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`CREATE TABLE "published_program_specs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "project_id" uuid, "diff" jsonb, "spec" jsonb NOT NULL, "previous_id" uuid, "publisher" character varying NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "REL_cd3bc63e5db728c1326f467d0f" UNIQUE ("previous_id"), CONSTRAINT "PK_e5f86d3262129b153e01d464a75" PRIMARY KEY ("id"))`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {}
}
