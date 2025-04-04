import { MigrationInterface, QueryRunner } from "typeorm";

export class RemovePlaylistConstraints1743767005994
	implements MigrationInterface
{
	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
            ALTER TABLE "public"."playlists" DROP CONSTRAINT IF EXISTS "playlist_title_uniqueness_key";
        `);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {}
}
