import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewColumnToDeployment1741710212737 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE deployments 
            ADD COLUMN is_published BOOLEAN DEFAULT FALSE;
            `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
