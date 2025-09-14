import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAccessCodeToRecipient1743763115370
	implements MigrationInterface
{
	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			" ALTER TABLE recipients ADD COLUMN access_code VARCHAR ",
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
			" ALTER TABLE recipients DROP COLUMN access_code",
		);
    }
}
