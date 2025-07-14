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
import { User } from "src/entities/user.entity";
import { EntityManager } from "typeorm";

@Injectable()
export class DeploymentMetadataService {
	async save(opts: {
		dto: DeploymentMetadataDto;
		currentUser: User;
	}) {
		const { dto, currentUser } = opts;

		const deployment = await Deployment.findOne({
			where: {
				deploymentnumber: dto.deployment.number,
				deployment: dto.deployment.name,
				project_id: dto.project,
			},
			relations: { project: true },
		});

		const metadata = new DeploymentMetadata();

		await DeploymentMetadata.getRepository().manager.transaction(
			async (manager) => {
				metadata.platform = dto.platform;
				metadata.deployment_id = deployment!._id;
				metadata.project_id = deployment!.project._id;
				metadata.created_at = dto.createdAt;
				metadata.user_id = currentUser._id;
				metadata.computer_name = dto.computerName;
				metadata.revision = dto.revision;
				metadata.published = dto.published === "true";
				metadata.languages = Object.keys(dto.contents).filter(
					(k) => k.indexOf("-") === -1,
				); // en, fr, dga
				metadata.variants = Object.keys(dto.contents).filter(
					(k) => k.indexOf("-") > -1,
				); // en-dga, dga-group-1, en-A
				metadata.acm_metadata = dto;

				await manager.save(DeploymentMetadata, metadata);

				// Save categories
				await this._saveCategories(manager, dto);

				// Save contents
				const languages = Object.keys(dto.contents);
				for (const l in dto.contents) {
					const contents = dto.contents[l];
					const messages = contents.messages;
					const playlistPrompts = contents.playlistPrompts;

					await this.saveDeploymentPackage(
						deployment!,
						{ package: contents.packageName, languageOrVariant: l },
						manager,
					);

					// Save messages
					for (const m of messages) {
						await this.saveMetadata(
							ContentType.message,
							deployment!,
							m,
							l,
							metadata,
							manager,
						);
					}
					for (const p of playlistPrompts) {
						await this.saveMetadata(
							ContentType.playlist_prompt,
							deployment!,
							p,
							l,
							metadata,
							manager,
						);
					}
				}
			},
		);

		return metadata;
	}

	/**
	 * Creates categories, categoriesinpackage and contentsinpackage records
	 */
	private async _saveCategories(
		manager: EntityManager,
		dto: DeploymentMetadataDto,
	) {
		await manager.delete(Category, { project_code: dto.project });

		// Save project categories
		await manager
			.createQueryBuilder()
			.insert()
			.into(Category)
			.values(
				dto.categories.map((c) => {
					const cat = new Category();
					cat.id = c.id;
					cat.name = c.name;
					cat.project_code = c.project;
					return cat;
				}),
			)
			.orIgnore()
			.execute();

		for (const key in dto.contents) {
			let order = 1;
			const contents = dto.contents[key];
			const existingData = await manager.find<CategoryInPackage>(
				CategoryInPackage,
				{
					where: { project: dto.project, contentpackage: contents.packageName },
				},
			);

			const categoryNames: Array<string | undefined> =
				contents.messages.flatMap((m) => m.category);

			// Save categories in packages
			for (const name of categoryNames) {
				// Skip if category id is not found
				const categoryId = dto.categories.find((c) => c.name === name)?.id;
				if (categoryId == null) continue;

				// Skip duplicates
				const exists = existingData.find((m) => m.categoryid === categoryId);
				if (exists != null) continue;

				const row = new CategoryInPackage();
				row.project = dto.project;
				row.order = order++;
				row.categoryid = categoryId;

				await manager.save(CategoryInPackage, row);
			}

			// Save content in package
			order = 1;
			for (const m of contents.messages) {
				const categoryId = dto.categories.find(
					(c) => c.name === m.category,
				)?.id;
				if (categoryId == null) continue;

				const pkg = new ContentInPackage();
				pkg.project_id = dto.project;
				pkg.contentpackage = contents.packageName;
				pkg.contentid = m.contentId;
				pkg.categoryid = categoryId;
				pkg.order = order++;

				await manager.save(ContentInPackage, pkg);
			}
		}
	}

	private async saveMetadata(
		type: ContentType,
		deployment: Deployment,
		data: MessageMetadataDto,
		languageOrVariant: string,
		metadata: DeploymentMetadata,
		manager: EntityManager,
	) {
		await this.saveContentMetadata(
			type,
			deployment,
			data,
			languageOrVariant,
			metadata,
			manager,
		);

		// await this.saveContentPackages(deployment, data, metadata, manager);
	}

	private async saveContentMetadata(
		type: ContentType,
		deployment: Deployment,
		data: Record<string, any>,
		languageOrVariant: string,
		metadata: DeploymentMetadata,
		manager: EntityManager,
	) {
		const content = new ContentMetadata();
		content.type = type;
		content.deployment_metadata_id = metadata.id;
		content.title = data.title;
		content.content_id = data.acm_id;
		content.relative_path = data.path;
		content.language_code = data.language;
		content.size = data.size;
		content.position = data.position;
		content.dc_publisher = data.publisher;
		content.source = data.source;
		content.related_id = data.related_id;
		content.dtb_revision = data.dtb_revision;
		content.recorded_at = data.recorded_at;
		content.keywords = data.keywords;
		content.timing = data.timing;
		content.speaker = data.speaker;
		content.goal = data.goal;
		content.transcription = data.transcription;
		content.notes = data.notes;
		content.status = data.status;
		content.categories = data.category;
		content.project = deployment.project_id;

		if (languageOrVariant.indexOf("-") > -1) {
			content.variant = languageOrVariant;
		}

		if (type === ContentType.message || type === ContentType.playlist_prompt) {
			content.playlist_id = (
				await Playlist.findOne({
					where: {
						title: data.playlist,
						deployment_id: deployment.id,
					},
				})
			)?._id;
		}

		// Parse duration
		if (data.duration != null) {
			const [duration, quality] = data.duration.split(/\s+/g); // eg. "05:46  l"
			const [minutes, seconds] = duration.split(":"); // eg. 05:46

			content.duration_sec = (+minutes * 60 + +seconds).toString();
			content.quality = quality;
		}

		await manager
			.createQueryBuilder()
			.insert()
			.into(ContentMetadata)
			.values(content)
			.orIgnore()
			.execute();
	}

	private async saveDeploymentPackage(
		deployment: Deployment,
		opts: { package: string; languageOrVariant: string },
		manager: EntityManager,
	) {
		const pkg = new PackageInDeployment();
		pkg.project_code = deployment.project_id;
		pkg.deployment_code = deployment.deploymentname ?? deployment.deployment;
		pkg.contentpackage = opts.package;
		pkg.packagename = opts.package;
		pkg.startdate = deployment.start_date;
		pkg.enddate = deployment.end_date;
		pkg.enddate = deployment.end_date;
		pkg.distribution = deployment.distribution;
		pkg.groups = `default,${opts.languageOrVariant}`;
		pkg.languagecode = opts.languageOrVariant;

		await manager
			.createQueryBuilder()
			.insert()
			.into(PackageInDeployment)
			.values(pkg)
			.orIgnore()
			.execute();
	}
}
