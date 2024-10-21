import { MigrationInterface, QueryRunner } from "typeorm";

export class SetProjectIdRefOnPrograms1729538794531
	implements MigrationInterface
{
	public async up(queryRunner: QueryRunner): Promise<void> {
		if (!(await queryRunner.hasColumn("programs", "project_id"))) {
			await queryRunner.query(`
            ALTER TABLE programs ADD COLUMN project_id UUID;
        `);
			await queryRunner.query(`
            ALTER TABLE programs ADD CONSTRAINT fk_project_id FOREIGN KEY (project_id) REFERENCES projects (_id);
        `);
		}

		// Update the project_id column with the correct project id from the projects table
		await queryRunner.query(`
            WITH results AS (SELECT projectcode, _id FROM projects)
            UPDATE programs
            SET project_id = results._id
            FROM results
            WHERE program_id = results.projectcode;
        `);

		// Make project_id not nullable
		await queryRunner.query(
			"ALTER TABLE programs ALTER COLUMN project_id SET NOT NULL",
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query("ALTER TABLE programs DROP COLUMN project_id");
	}
}
