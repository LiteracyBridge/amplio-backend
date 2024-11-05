import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUuidIdToPlaylist1727341394722 implements MigrationInterface {
    name = 'AddUuidIdToPlaylist1727341394722'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "playlists" ADD "_id" uuid NOT NULL DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "playlists" ADD CONSTRAINT "uq_playlist__id" UNIQUE ("_id")`);

    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "playlists" DROP CONSTRAINT "uq_playlist__id"`);
        await queryRunner.query(`ALTER TABLE "playlists" DROP COLUMN "_id"`);
    }

}
