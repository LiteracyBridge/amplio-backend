import { MigrationInterface, QueryRunner } from "typeorm";

export class Add_idToProjects1729509597907 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        const exists = await queryRunner.hasColumn('projects', '_id');
        if (exists) {
            return;
        }

        await queryRunner.query(`ALTER TABLE "projects" ADD "_id" uuid NOT NULL DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "projects" ADD CONSTRAINT "unq_prj__id" UNIQUE ("_id")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "_id"`);
    }


}
