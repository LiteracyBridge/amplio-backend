import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewColumnToUsers1737621277283 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
                // Write the SQL to add the new column here
                await queryRunner.query(`
                    ALTER TABLE users
                    ADD COLUMN status VARCHAR(255) NOT NULL DEFAULT 'ACTIVE';
                `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
              // Write the SQL to revert the change here
              await queryRunner.query(`
                ALTER TABLE users
                DROP COLUMN status;
            `);
    }

}
