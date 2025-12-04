import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUniqConstraintToMsgLang1759482924476
	implements MigrationInterface
{
	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
       ALTER TABLE "public"."message_languages" ADD CONSTRAINT "unq_message_language" UNIQUE ("message_id", "language_code");
    `);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {}
}
