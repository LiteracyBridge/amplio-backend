import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUuidToUsers1727464663122 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "_id" uuid NOT NULL DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "uq_user__id" UNIQUE ("_id")`);

    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "uq_user__id"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "_id"`);
    }

}
