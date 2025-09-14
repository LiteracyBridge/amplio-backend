import { query } from "express";
import { MigrationInterface, QueryRunner } from "typeorm";

export class ChangeSmallintsToInOnPlayedevents1752687207024
	implements MigrationInterface
{
	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			"ALTER TABLE playedevents ALTER COLUMN volume TYPE integer",
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {}
}
