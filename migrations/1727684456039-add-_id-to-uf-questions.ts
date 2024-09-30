import { MigrationInterface, QueryRunner } from "typeorm";

export class Add_idToUfQuestions1727684456039 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "uf_questions" ADD "_id" uuid NOT NULL DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "uf_questions" ADD CONSTRAINT "uf_question__id" UNIQUE ("_id")`);

        await queryRunner.query(`ALTER TABLE "uf_survey_sections" ADD "_id" uuid NOT NULL DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "uf_survey_sections" ADD CONSTRAINT "unq__id" UNIQUE ("_id")`);

    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "uf_questions" DROP CONSTRAINT "uf_question__id"`);
        await queryRunner.query(`ALTER TABLE "uf_questions" DROP COLUMN "_id"`);

        await queryRunner.query(`ALTER TABLE "uf_survey_sections" DROP COLUMN "_id"`);
    }

}
