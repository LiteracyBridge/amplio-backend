import { Injectable } from "@nestjs/common";
import { Category } from "src/entities/category.entity";
import { CategoryInPackage } from "src/entities/category_in_package.entity";
import { ContentInPackage } from "src/entities/content_in_package.entity";
import {
	ContentMetadata,
	ContentType,
} from "src/entities/content_metadata.entity";
import { Deployment } from "src/entities/deployment.entity";
import { DeploymentMetadata } from "src/entities/deployment_metadata.entity";
import { PackageInDeployment } from "src/entities/package_in_deployment.entity";
import { Playlist } from "src/entities/playlist.entity";
import { TalkingBookLoaderId } from "src/entities/tbloader-ids.entity";
import { User } from "src/entities/user.entity";
import { TbLoaderService } from "src/tb-loader/tb-loader.service";
import { EntityManager } from "typeorm";
import * as Excel from "exceljs";
import { writeFile, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { ProjectLanguage } from "src/entities/language.entity";
import { Logger } from "src/logger";

@Injectable()
export class TalkingBookMetadataService {
	constructor(private tbloaderService: TbLoaderService) {}

	async save(opts: {
		dto: any;
		currentUser: User;
	}) {
		const { dto } = opts;

		await DeploymentMetadata.getRepository().manager.transaction(
			async (manager) => {
				// Save languages
				if (dto.languages) {
					const csv = `${tmpdir()}/${randomUUID()}.csv`;
					writeFileSync(csv, dto.languages);

					const workbook = new Excel.Workbook();
					const worksheet = await workbook.csv.readFile(csv);

					worksheet.eachRow(async (row: Excel.Row, rowNumber: number) => {
						if (rowNumber === 1) return null;

						await manager
							.createQueryBuilder()
							.insert()
							.into(ProjectLanguage)
							.values({
								code: row.values[1],
								name: row.values[2],
								projectcode: row.values[3],
							})
							.orIgnore()
							.execute();
					});
				}

				// Save categories
				if (dto.categories) {
					const csv = `${tmpdir()}/${randomUUID()}.csv`;
					writeFileSync(csv, dto.categories);

					const workbook = new Excel.Workbook();
					const worksheet = await workbook.csv.readFile(csv);

					worksheet.eachRow(async (row: Excel.Row, rowNumber: number) => {
						if (rowNumber === 1) return;

						await manager
							.createQueryBuilder()
							.insert()
							.into(Category)
							.values({
								id: row.values[1],
								name: row.values[2],
								project_code: row.values[3],
							})
							.orIgnore()
							.execute();
					});
				}

				// Save packages In Deployment
				if (dto.packagesInDeployment) {
					const csv = `${tmpdir()}/${randomUUID()}.csv`;
					writeFileSync(csv, dto.packagesInDeployment);

					const workbook = new Excel.Workbook();
					const worksheet = await workbook.csv.readFile(csv);

					worksheet.eachRow(async (row: Excel.Row, rowNumber: number) => {
						if (rowNumber === 1) return;

						await manager
							.createQueryBuilder()
							.insert()
							.into(PackageInDeployment)
							.values({
								project_code: row.values[1],
								deployment_code: row.values[2],
								contentpackage: row.values[3],
								packagename: row.values[4],
								startdate: row.values[5],
								enddate: row.values[6],
								languagecode: row.values[7],
								groups: row.values[8],
								distribution: row.values[9],
							})
							.orIgnore()
							.execute();
					});
				}

				// Save categories In package
				if (dto.categoriesInPackage) {
					const csv = `${tmpdir()}/${randomUUID()}.csv`;
					writeFileSync(csv, dto.categoriesInPackage);

					const workbook = new Excel.Workbook();
					const worksheet = await workbook.csv.readFile(csv);

					worksheet.eachRow(async (row: Excel.Row, rowNumber: number) => {
						if (rowNumber === 1) return;

						await manager
							.createQueryBuilder()
							.insert()
							.into(CategoryInPackage)
							.values({
								project: row.values[1],
								contentpackage: row.values[2],
								categoryid: row.values[3],
								position: row.values[4],
							})
							.orIgnore()
							.execute();
					});
				}

				// Save contents In package
				if (dto.contentInPackages) {
					const csv = `${tmpdir()}/${randomUUID()}.csv`;
					writeFileSync(csv, dto.contentInPackages);

					const workbook = new Excel.Workbook();
					const worksheet = await workbook.csv.readFile(csv);

					worksheet.eachRow(async (row: Excel.Row, rowNumber: number) => {
						if (rowNumber === 1) return;

						await manager
							.createQueryBuilder()
							.insert()
							.into(ContentInPackage)
							.values({
								project_id: row.values[1],
								contentpackage: row.values[2],
								contentid: row.values[3],
								categoryid: row.values[4],
								position: row.values[5],
							})
							.orIgnore()
							.execute();
					});
				}

				// Save contents In package
				if (dto.metadata) {
					const csv = `${tmpdir()}/${randomUUID()}.csv`;
					writeFileSync(csv, dto.metadata);

					console.log(csv);
					const workbook = new Excel.Workbook();
					const worksheet = await workbook.csv.readFile(csv);

					worksheet.eachRow(async (row: Excel.Row, rowNumber: number) => {
						// console.log(row.values, rowNumber);

						if (rowNumber === 1) return;

						const query = await manager
							.createQueryBuilder()
							.insert()
							.into(ContentMetadata)
							.values({
								title: row.values[1],
								dc_publisher: row.values[2],
								content_id: row.values[3],
								source: row.values[4],
								language_code: row.values[5],
								related_id: row.values[6],
								dtb_revision: row.values[7],
								duration_sec: row.values[8],
								format: row.values[9],
								audience: row.values[10],
								recorded_at: row.values[11],
								keywords: row.values[12],
								timing: row.values[13],
								speaker: row.values[14],
								goal: row.values[15],
								transcription: row.values[16],
								notes: row.values[17],
								community: row.values[18],
								status: row.values[19],
								categories: row.values[20],
								quality: row.values[21],
								project: row.values[22],
								sdg_goals: row.values[23],
								sdg_targets: row.values[24],
							});

						// Rewrite the sql query with update on conflict.
						// .orIgnore() with sql statements doesn't work. Don't ask me wh :)
						const sql = `
              ${query.getSql()}

              ON CONFLICT ON CONSTRAINT contentmetadata2_pkey DO UPDATE SET
                title=EXCLUDED.title,
                dc_publisher=EXCLUDED.dc_publisher,
                source=EXCLUDED.source,
                languagecode=EXCLUDED.languagecode,
                relatedid=EXCLUDED.relatedid,
                dtb_revision=EXCLUDED.dtb_revision,
                duration_sec=EXCLUDED.duration_sec,
                format=EXCLUDED.format,
                targetaudience=EXCLUDED.targetaudience,
                daterecorded=EXCLUDED.daterecorded,
                keywords=EXCLUDED.keywords,
                timing=EXCLUDED.timing,
                speaker=EXCLUDED.speaker,
                goal=EXCLUDED.goal,
                transcription=EXCLUDED.transcription,
                notes=EXCLUDED.notes,
                community=EXCLUDED.community,
                status=EXCLUDED.status,
                categories=EXCLUDED.categories,
                quality=EXCLUDED.quality,
                sdg_goals=EXCLUDED.sdg_goals,
                sdg_targets=EXCLUDED.sdg_targets
              `;

						const params = query.getParameters();
						await manager.query(sql, Object.values(params));
					});

					new Logger().log(
						`Saved ${worksheet.rowCount} metadata records to db`,
					);
				}
			},
		);
	}
}
