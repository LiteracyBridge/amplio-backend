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
		const { dto, currentUser } = opts;

		const err = await DeploymentMetadata.getRepository().manager.transaction(
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

		console.log(err);

		// const metadata = new DeploymentMetadata();

		// await DeploymentMetadata.getRepository().manager.transaction(
		// 	async (manager) => {
		// 		metadata.platform = dto.platform;
		// 		metadata.deployment_id = deployment!._id;
		// 		metadata.project_id = deployment!.project._id;
		// 		metadata.created_at = dto.createdAt;
		// 		metadata.user_id = currentUser._id;
		// 		metadata.computer_name = dto.computerName;
		// 		metadata.revision = dto.revision;
		// 		metadata.published = dto.published === "true";
		// 		metadata.languages = Object.keys(dto.contents).filter(
		// 			(k) => k.indexOf("-") === -1,
		// 		); // en, fr, dga
		// 		metadata.variants = Object.keys(dto.contents).filter(
		// 			(k) => k.indexOf("-") > -1,
		// 		); // en-dga, dga-group-1, en-A
		// 		metadata.acm_metadata = dto;

		// 		await manager.save(DeploymentMetadata, metadata);

		// 		// Save categories
		// 		await this._saveCategories(manager, dto);

		// 		// Save contents
		// 		const languages = Object.keys(dto.contents);
		// 		for (const l in dto.contents) {
		// 			const contents = dto.contents[l];
		// 			const messages = contents.messages;
		// 			const playlistPrompts = contents.playlistPrompts;

		// 			await this.saveDeploymentPackage(
		// 				deployment!,
		// 				{ package: contents.packageName, languageOrVariant: l },
		// 				manager,
		// 			);

		// 			// Save messages
		// 			for (const m of messages) {
		// 				await this.saveMetadata(
		// 					ContentType.message,
		// 					deployment!,
		// 					m,
		// 					l,
		// 					metadata,
		// 					manager,
		// 				);
		// 			}
		// 			for (const p of playlistPrompts) {
		// 				await this.saveMetadata(
		// 					ContentType.playlist_prompt,
		// 					deployment!,
		// 					p,
		// 					l,
		// 					metadata,
		// 					manager,
		// 				);
		// 			}
		// 		}
		// 	},
		// );

		// // Allocate Talking Book Id to user
		// const tbidData = await TalkingBookLoaderId.findOne({
		// 	where: { email: currentUser.email },
		// });
		// if (tbidData == null) {
		// 	await this.tbloaderService.reserve(currentUser);
		// }

		// return metadata;
	}

	/**
	 * Creates categories, categoriesinpackage and contentsinpackage records
	 */
	// private async _saveCategories(
	// 	manager: EntityManager,
	// 	dto: DeploymentMetadataDto,
	// ) {
	// 	// Save project categories
	// 	await manager
	// 		.createQueryBuilder()
	// 		.insert()
	// 		.into(Category)
	// 		.values(
	// 			dto.categories.map((c) => {
	// 				const cat = new Category();
	// 				cat.id = c.id;
	// 				cat.name = c.name;
	// 				cat.project_code = c.project;
	// 				return cat;
	// 			}),
	// 		)
	// 		.orIgnore()
	// 		.execute();

	// 	for (const key in dto.contents) {
	// 		let order = 1;
	// 		const contents = dto.contents[key];
	// 		const existingData = await manager.find<CategoryInPackage>(
	// 			CategoryInPackage,
	// 			{
	// 				where: { project: dto.project, contentpackage: contents.packageName },
	// 			},
	// 		);

	// 		const categoryNames: Array<string | undefined> =
	// 			contents.messages.flatMap((m) => m.category);

	// 		// Save categories in packages
	// 		for (const name of categoryNames) {
	// 			// Skip if category id is not found
	// 			const categoryId = dto.categories.find((c) => c.name === name)?.id;
	// 			if (categoryId == null) continue;

	// 			// Skip duplicates
	// 			const exists = existingData.find((m) => m.categoryid === categoryId);
	// 			if (exists != null) continue;

	// 			const row = new CategoryInPackage();
	// 			row.project = dto.project;
	// 			row.position = order++;
	// 			row.categoryid = categoryId;
	// 			row.contentpackage = contents.packageName;

	// 			await manager.save(CategoryInPackage, row);
	// 		}

	// 		// Save content in package
	// 		order = 1;
	// 		for (const m of contents.messages) {
	// 			const categoryId = dto.categories.find(
	// 				(c) => c.name === m.category,
	// 			)?.id;
	// 			if (categoryId == null) continue;

	// 			const pkg = new ContentInPackage();
	// 			pkg.project_id = dto.project;
	// 			pkg.contentpackage = contents.packageName;
	// 			pkg.contentid = m.contentId;
	// 			pkg.categoryid = categoryId;
	// 			pkg.position = order++;

	// 			await manager
	// 				.createQueryBuilder()
	// 				.insert()
	// 				.into(ContentInPackage)
	// 				.values(pkg)
	// 				.orIgnore()
	// 				.execute();
	// 		}
	// 	}
	// }

	// private async saveMetadata(
	// 	type: ContentType,
	// 	deployment: Deployment,
	// 	data: MessageMetadataDto,
	// 	languageOrVariant: string,
	// 	metadata: DeploymentMetadata,
	// 	manager: EntityManager,
	// ) {
	// 	await this.saveContentMetadata(
	// 		type,
	// 		deployment,
	// 		data,
	// 		languageOrVariant,
	// 		metadata,
	// 		manager,
	// 	);

	// 	// await this.saveContentPackages(deployment, data, metadata, manager);
	// }

	// private async saveContentMetadata(
	// 	type: ContentType,
	// 	deployment: Deployment,
	// 	data: MessageMetadataDto,
	// 	languageOrVariant: string,
	// 	metadata: DeploymentMetadata,
	// 	manager: EntityManager,
	// ) {
	// 	const content = new ContentMetadata();
	// 	content.type = type;
	// 	content.deployment_metadata_id = metadata.id;
	// 	content.title = data.title;
	// 	content.content_id = data.contentId;
	// 	content.relative_path = data.path;
	// 	content.language_code = data.language;
	// 	content.size = data.size;
	// 	content.position = data.position;
	// 	content.dc_publisher = data.publisher;
	// 	content.source = data.source!;
	// 	content.related_id = data.relatedId;
	// 	content.dtb_revision = data.dtbRevision;
	// 	content.recorded_at = data.recordedAt;
	// 	content.keywords = data.keywords;
	// 	content.timing = data.timing;
	// 	content.speaker = data.speaker;
	// 	content.goal = data.goal;
	// 	content.transcription = data.transcription;
	// 	content.notes = data.notes;
	// 	content.status = data.status;
	// 	content.categories = data.category;
	// 	content.project = deployment.project_id;

	// 	if (languageOrVariant.indexOf("-") > -1) {
	// 		content.variant = languageOrVariant;
	// 	}

	// 	if (type === ContentType.message || type === ContentType.playlist_prompt) {
	// 		content.playlist_id = (
	// 			await Playlist.findOne({
	// 				where: {
	// 					title: data.playlist,
	// 					deployment_id: deployment.id,
	// 				},
	// 			})
	// 		)?._id;
	// 	}

	// 	// Parse duration
	// 	if (data.duration != null) {
	// 		const [duration, quality] = data.duration.split(/\s+/g); // eg. "05:46  l"
	// 		const [minutes, seconds] = duration.split(":"); // eg. 05:46

	// 		content.duration_sec = (+minutes * 60 + +seconds).toString();
	// 		content.quality = quality;
	// 	}

	// 	await manager
	// 		.createQueryBuilder()
	// 		.insert()
	// 		.into(ContentMetadata)
	// 		.values(content)
	// 		.orIgnore()
	// 		.execute();
	// }

	// private async saveDeploymentPackage(
	// 	deployment: Deployment,
	// 	opts: { package: string; languageOrVariant: string },
	// 	manager: EntityManager,
	// ) {
	// 	const pkg = new PackageInDeployment();
	// 	pkg.project_code = deployment.project_id;
	// 	pkg.deployment_code = deployment.deploymentname ?? deployment.deployment;
	// 	pkg.contentpackage = opts.package;
	// 	pkg.packagename = opts.package;
	// 	pkg.startdate = deployment.start_date;
	// 	pkg.enddate = deployment.end_date;
	// 	pkg.enddate = deployment.end_date;
	// 	pkg.distribution = deployment.distribution;
	// 	pkg.groups = `default,${opts.languageOrVariant}`;
	// 	pkg.languagecode = opts.languageOrVariant;

	// 	await manager
	// 		.createQueryBuilder()
	// 		.insert()
	// 		.into(PackageInDeployment)
	// 		.values(pkg)
	// 		.orIgnore()
	// 		.execute();
	// }
}
