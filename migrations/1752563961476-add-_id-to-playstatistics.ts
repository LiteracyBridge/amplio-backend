import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIdToPlaystatistics1752563961476 implements MigrationInterface {
        name = 'AddIdToPlaystatistics1752563961476'

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "playstatistics" ADD "_id" uuid NOT NULL DEFAULT uuid_generate_v4()`,
		);
		await queryRunner.query(
			`ALTER TABLE "playstatistics" ADD CONSTRAINT "uq_playstatistics__id" UNIQUE ("_id")`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "playstatistics" DROP CONSTRAINT "uq_playstatistics__id"`,
		);
		await queryRunner.query(`ALTER TABLE "playstatistics" DROP COLUMN "_id"`);
	}
}
