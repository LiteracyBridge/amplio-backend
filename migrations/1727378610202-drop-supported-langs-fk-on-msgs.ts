import { MigrationInterface, QueryRunner } from "typeorm";

export class DropSupportedLangsFkOnMsgs1727378610202 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE message_languages DROP CONSTRAINT message_languages_language_code_fkey;
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE message_languages ADD CONSTRAINT message_languages_language_code_fkey FOREIGN KEY (language_code) REFERENCES supported_languages(languagecode);
        `)
    }

}
