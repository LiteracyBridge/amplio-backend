import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateLogsTable1727464807727 implements MigrationInterface {
    name = 'CreateLogsTable1727464807727'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "_id" character varying, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "message" text NOT NULL, "data" text, "extra" text, "tags" text, "user_id" uuid, CONSTRAINT "PK_fb1b805f2f7795de79fa69340ba" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "logs"`);
    }

}
