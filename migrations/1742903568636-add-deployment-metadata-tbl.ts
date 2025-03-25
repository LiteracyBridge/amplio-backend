import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDeploymentMetadataTbl1742903568636 implements MigrationInterface {
    name = 'AddDeploymentMetadataTbl1742903568636'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "deployment_metadata" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "program_id" integer NOT NULL, "revision" character varying NOT NULL, "platform" character varying NOT NULL, "published" boolean NOT NULL, "user_id" uuid NOT NULL, "deployment_id" uuid NOT NULL, "created_at" TIME WITH TIME ZONE NOT NULL, "computer_name" character varying NOT NULL, "languages" jsonb NOT NULL, "variants" jsonb NOT NULL, "acm_metadata" jsonb NOT NULL, "programId" integer, CONSTRAINT "PK_0e4bc4d4cb03ada18871ef07b13" PRIMARY KEY ("id"))`);

        await queryRunner.query(`ALTER TABLE "deployment_metadata" ADD CONSTRAINT "FK_71ea4d4805c20375911ee5e5dec" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);

        await queryRunner.query(`ALTER TABLE "deployment_metadata" ADD CONSTRAINT "FK_0b3929459ade39283e79b049024" FOREIGN KEY ("deployment_id") REFERENCES "deployments"("_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);

        await queryRunner.query(`ALTER TABLE "deployment_metadata" ADD CONSTRAINT "FK_b09e6b5be262666bf18de561105" FOREIGN KEY ("user_id") REFERENCES "users"("_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);

        await queryRunner.query(`ALTER TABLE "contentmetadata2" ADD "transcription" character varying`);
        await queryRunner.query(`ALTER TABLE "contentmetadata2" ADD "variant" character varying`);
        await queryRunner.query(`ALTER TABLE "contentmetadata2" ADD "relative_path" character varying`);
        await queryRunner.query(`ALTER TABLE "contentmetadata2" ADD "type" character varying`);
        await queryRunner.query(`ALTER TABLE "contentmetadata2" ADD "size" double precision`);
        await queryRunner.query(`ALTER TABLE "contentmetadata2" ADD "position" integer`);
        await queryRunner.query(`ALTER TABLE "contentmetadata2" ADD "playlist_id" uuid`);
        await queryRunner.query(`ALTER TABLE "contentmetadata2" ADD "deployment_metadata_id" uuid`);

        await queryRunner.query(`ALTER TABLE "contentmetadata2" ADD CONSTRAINT "FK_54080b9cf36df56e8f057323dfa" FOREIGN KEY ("playlist_id") REFERENCES "playlists"("_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "contentmetadata2" ADD CONSTRAINT "fk_deployment_metadata_id" FOREIGN KEY ("deployment_metadata_id") REFERENCES "deployment_metadata"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "contentmetadata2" DROP COLUMN "deployment_metadata_id"`);

        await queryRunner.query(`DROP TABLE "deployment_metadata"`);

        await queryRunner.query(`ALTER TABLE "contentmetadata2" DROP COLUMN "playlist_id"`);
        await queryRunner.query(`ALTER TABLE "contentmetadata2" DROP COLUMN "relative_path"`);
        await queryRunner.query(`ALTER TABLE "contentmetadata2" DROP COLUMN "variant"`);
        await queryRunner.query(`ALTER TABLE "contentmetadata2" DROP COLUMN "transcription"`);
    }

}
