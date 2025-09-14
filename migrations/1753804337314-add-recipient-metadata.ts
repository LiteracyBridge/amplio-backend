import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRecipientMetadata1753804337314 implements MigrationInterface {
	name = "AddRecipientMetadata1753804337314";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`CREATE TABLE "recipient_metadata" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "gender" character varying NOT NULL, "recipient_id" character varying NOT NULL, "age" integer NOT NULL, CONSTRAINT "recipient_uniq_key" UNIQUE ("name", "gender", "age", "recipient_id"), CONSTRAINT "PK_db449f162a397839ac009794b4c" PRIMARY KEY ("id"))`,
		);
		// await queryRunner.query(
		// 	`ALTER TABLE "recipient_metadata" ADD CONSTRAINT "FK_02a946ab2054c1f8b2851e5df46" FOREIGN KEY ("recipient_id") REFERENCES "recipients"("recipientid", "project") ON DELETE NO ACTION ON UPDATE NO ACTION`,
		// );
	}
	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "recipient_metadata" DROP CONSTRAINT "FK_02a946ab2054c1f8b2851e5df46"`,
		);
		await queryRunner.query(`DROP TABLE "recipient_metadata"`);
	}
}
