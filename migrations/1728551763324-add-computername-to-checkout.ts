import { MigrationInterface, QueryRunner } from "typeorm";

export class AddComputernameToCheckout1728551763324
	implements MigrationInterface
{
	name = "AddComputernameToCheckout1728551763324";

	public async up(queryRunner: QueryRunner): Promise<void> {
		if(!(await queryRunner.hasTable("acm_checkout"))){
			await queryRunner.query(`
				CREATE TABLE acm_checkout (
					id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
					last_in_name VARCHAR,
					last_in_version VARCHAR,
					last_in_comment VARCHAR,
					last_in_contact VARCHAR,
					now_out_name VARCHAR,
					now_out_contact VARCHAR,
					now_out_date TIMESTAMP WITH TIME ZONE,
					now_out_version VARCHAR,
					now_out_comment VARCHAR,
					now_out_key VARCHAR,
					acm_comment VARCHAR,
					acm_state VARCHAR NOT NULL,
					last_in_file_name VARCHAR NOT NULL,
					last_in_date TIMESTAMP WITH TIME ZONE NOT NULL,
					project_id UUID UNIQUE,
					FOREIGN KEY (project_id) REFERENCES projects (_id)
				);
			`)
		}
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
