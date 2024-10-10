import { MigrationInterface, QueryRunner } from "typeorm";

export class AddComputernameToCheckout1728551763324
	implements MigrationInterface
{
	name = "AddComputernameToCheckout1728551763324";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "acm_checkout" ADD "now_out_computername" character varying`,
		);
		await queryRunner.query(
			`ALTER TABLE "acm_checkout" ADD "resettable" boolean`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "acm_checkout" DROP COLUMN "now_out_computername"`,
		);
		await queryRunner.query(
			`ALTER TABLE "acm_checkout" DROP COLUMN "resettable"`,
		);
	}
}
