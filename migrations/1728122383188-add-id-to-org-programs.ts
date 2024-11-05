import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIdToOrgPrograms1728122383188 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "organisation_programs" ADD "id" uuid NOT NULL DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "organisation_programs" ADD CONSTRAINT "unq_id" UNIQUE ("id")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "organisation_programs" DROP CONSTRAINT "id"`);
    }

}
