import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUuidToMsgsDplts1727363689048 implements MigrationInterface {
    name = "AddUuidToMsgsDplts1727363689048"

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "messages" ADD "_id" uuid NOT NULL DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "messages" ADD CONSTRAINT "uq_message__id" UNIQUE ("_id")`);

        await queryRunner.query(`ALTER TABLE "deployments" ADD "_id" uuid NOT NULL DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "deployments" ADD CONSTRAINT "uq_deployment__id" UNIQUE ("_id")`);

    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "messages" DROP CONSTRAINT "uq_message__id"`);
        await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "_id"`);

        await queryRunner.query(`ALTER TABLE "deployments" DROP CONSTRAINT "uq_deployment__id"`);
        await queryRunner.query(`ALTER TABLE "deployments" DROP COLUMN "_id"`);
    }
}
