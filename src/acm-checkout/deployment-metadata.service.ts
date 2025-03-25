import { Injectable } from "@nestjs/common";
import {
	ContentMetadata,
	ContentType,
} from "src/entities/content_metadata.entity";
import { Deployment } from "src/entities/deployment.entity";
import { DeploymentMetadata } from "src/entities/deployment_metadata.entity";
import { Playlist } from "src/entities/playlist.entity";
import { User } from "src/entities/user.entity";
import { EntityManager } from "typeorm";

@Injectable()
export class DeploymentMetadataService {
	async save(opts: {
		dto: Record<string, any>;
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
				metadata.created_at = dto.created_at;
				metadata.user_id = currentUser._id;
				metadata.computer_name = dto.computer_name;
				metadata.revision = dto.revision;
				metadata.published = dto.published ?? true;
				metadata.languages = Object.keys(dto.contents).filter(
					(k) => k.indexOf("-") === -1,
				); // en, fr, dga
				metadata.variants = Object.keys(dto.contents).filter(
					(k) => k.indexOf("-") > -1,
				); // en-dga, dga-group-1, en-A
				metadata.acm_metadata = dto;

				await manager.save(DeploymentMetadata, metadata);

				// Save contents
				const keys = Object.keys(dto.contents);
				for (const k of keys) {
					const messages = dto.contents[k].messages;
					const playlistPrompts = dto.contents[k].playlist_prompts;

					// Save messages
					for (const m of messages) {
						await this.saveContent(
							ContentType.message,
							deployment!,
							m,
							k,
							metadata,
							manager,
						);
					}
					for (const p of playlistPrompts) {
						await this.saveContent(
							ContentType.playlist_prompt,
							deployment!,
							p,
							k,
							metadata,
							manager,
						);
					}
				}
			},
		);

		return metadata;
	}

	private async saveContent(
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
}
