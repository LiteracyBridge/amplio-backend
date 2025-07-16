import {
	BadRequestException,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import appConfig from "src/app.config";
import { DeploymentMetadata } from "src/entities/deployment_metadata.entity";
import { Recipient } from "src/entities/recipient.entity";
import os from "node:os";
import fs from "node:fs";
import { execSync } from "node:child_process";
import { zipDirectory } from "src/utilities";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { CompanionStatisticsDto } from "./companion.dto";
import { PlayedEvent } from "src/entities/played_event.entity";
import { DateTime } from "luxon";
import { isNotEmpty } from "class-validator";
import { groupBy, isNonNullish } from "remeda";
import { PlayStatistic } from "src/entities/playstatistics.entity";

@Injectable()
export class CompanionAppService {
	async verifyRecipientCode(code?: string) {
		if (code === "" || code == null) {
			throw new BadRequestException("Recipient code is required!");
		}

		const recipient = await Recipient.findOne({
			where: { access_code: code },
			relations: { project: true },
		});

		if (recipient == null) {
			throw new NotFoundException("Recipient code is invalid");
		}

		return {
			recipient: recipient,
			project: recipient.project,
			package: await DeploymentMetadata.findOne({
				where: { project_id: recipient.project._id, published: true },
				order: { created_at: "DESC" },
			}),
		};
	}

	async downloadPrompts(id: string, language: string) {
		const metadata = await DeploymentMetadata.findOne({
			where: { id: id, published: true },
			relations: { project: true },
		});

		if (metadata == null) {
			throw new NotFoundException("Invalid deployment ID");
		}

		// Verify the language code is valid
		if (metadata.acm_metadata.system_prompts[language] == null) {
			throw new BadRequestException("Invalid language provided");
		}

		const promptsCache = `${os.tmpdir()}/prompts-${metadata.revision}-${language}.zip`;
		if (fs.existsSync(promptsCache)) {
			return promptsCache;
		}

		// No cache exists, download from s3
		const promptsDir = `${os.tmpdir()}/prompts-${metadata.revision}-${language}`;
		if (!fs.existsSync(promptsDir)) {
			fs.mkdirSync(promptsDir);
		}

		// Download system prompts
		const key = `${this.getRevisionPath(metadata)}/system-prompts/${language}/`;
		const output1 = await execSync(`
    aws s3 sync s3://${appConfig().buckets.content}/${key} ${promptsDir}
    `);
		console.log("stdout:", output1);

		// Download playlist prompts
		const key2 = `${this.getRevisionPath(metadata)}/contents/${language}/playlist-prompts/`;
		const cmd = `
      aws s3 sync \
      s3://${appConfig().buckets.content}/${key2} ${promptsDir}
    `;
		const output = await execSync(cmd);
		console.log("stdout:", output);

		await zipDirectory(promptsDir, promptsCache);

		return promptsCache;
	}

	async downloadContent(opts: {
		id: string;
		language: string;
		contentId: string;
	}) {
		const { id, language, contentId } = opts;

		const metadata = await DeploymentMetadata.findOne({
			where: { id: id, published: true },
			relations: { project: true },
		});

		if (metadata == null) {
			throw new NotFoundException("Invalid deployment id");
		}

		// Verify the language code is valid
		const contents = metadata.acm_metadata.contents[language];
		if (contents == null) {
			throw new BadRequestException("Invalid language provided");
		}

		const msg = contents.messages.find((m) => m.acm_id === contentId);
		if (msg == null) {
			throw new NotFoundException("Message cannot be found");
		}

		// Generates a presigned url
		const client = new S3Client({
			region: appConfig().aws.region,
			credentials: {
				accessKeyId: appConfig().aws.accessKeyId!,
				secretAccessKey: appConfig().aws.secretId!,
			},
		});
		const command = new GetObjectCommand({
			Bucket: `${appConfig().buckets.content}`,
			Key: `${this.getRevisionPath(metadata)}/${msg.path}`,
		});
		// @ts-ignore
		const url = await getSignedUrl(client, command, { expiresIn: 604800 });

		return url;
	}

	async recordStats(statistics: CompanionStatisticsDto[]) {
		await PlayedEvent.getRepository().manager.transaction(async (manager) => {
			// Save played event for each stats
			const events: PlayedEvent[] = [];
			for (const stat of statistics) {
				const timestamp = DateTime.fromISO(stat.timestamp);
				const recipient = (await Recipient.findOne({
					where: { program_id: stat.projectCode, id: stat.recipientId },
				}))!;
				const event = new PlayedEvent();
				event.talkingbookid = stat.deviceName;
				event.cycle = 0;
				event.dayinperiod = timestamp.day;
				event.year = timestamp.year;
				event.timeinday = timestamp.toISOTime({ extendedZone: true })!;
				event.timeplayed = stat.listenedDuration;
				event.totaltime = stat.audioDuration;
				event.percentagedone = stat.listenedDuration / stat.audioDuration;
				event.isfinished = event.percentagedone >= 1;
				event.packageid = stat.packageName;
				event.contentid = stat.contentId;
				event.village = recipient.community_name;
				if (
					!isNonNullish(recipient.group_name) &&
					!isNotEmpty(recipient.group_name)
				) {
					event.village = `${event.village} (${recipient.group_name})`;
				}

				event.householdrotation = 0;
				event.period = 0;
				event.volume = 0;
				event.maxvolts = 0;
				event.minvolts = 0;
				event.steadystatevolts = 0;
				events.push(event);
			}

			await manager
				.createQueryBuilder()
				.insert()
				.into(PlayedEvent)
				.values(events)
				.execute();

			// Generate play statistic
			const contentIds: Set<string> = new Set(
				statistics.map((s) => s.contentId),
			);
			for (const id of contentIds) {
				const item = statistics.find((s) => s.contentId === id)!;

				const playEvents = await manager
					.getRepository(PlayedEvent)
					.createQueryBuilder()
					.select("timeplayed, village, talkingbookid")
					.where("contentid = :id", { id: id })
					.andWhere("talkingbookid = :tbId", { tbId: item.deviceName })
					.andWhere("packageid = :pkg", { pkg: item.packageName })
					.groupBy("village, talkingbookid")
					.getMany();

				const groupedEvents = groupBy(
					playEvents,
					(p) => `${p.village}-${p.talkingbookid}`,
				);
				for (const key in groupedEvents) {
					const events: PlayedEvent[] = groupedEvents[key];

					const playStat =
						(await manager.findOne(PlayStatistic, {
							where: {
								contentid: item.contentId,
								contentpackage: item.packageName,
								community: events[0].village,
								project: item.projectCode,
								talkingbookid: events[0].talkingbookid,
							},
						})) ?? new PlayStatistic();

					playStat.timestamp = DateTime.now().toISO({ extendedZone: true });
					playStat.project = item.projectCode;
					playStat.deployment = item.deploymentName;
					playStat.contentpackage = item.packageName;
					playStat.talkingbookid = events[0].talkingbookid;
					playStat.contentid = item.contentId;
					playStat.community = events[0].village;

					const played = this.computePlayedStats(events);
					playStat.played_seconds = played.played_seconds;
					playStat.started = played.started;
					playStat.one_quarter = played.one_quarter;
					playStat.half = played.half;
					playStat.threequarters = played.threequarters;
					playStat.completed = played.completed;

					// if (playStat._id != null) {
					await manager.save(PlayStatistic, playStat);
					// } else {
					// 	await manager.update(
					// 		PlayStatistic,
					// 		{ _id: playStat._id },
					// 		playStat,
					// 	);
					// }
				}
			}
		});
	}

	private computePlayedStats(events: PlayedEvent[]) {
		const playStat = {
			played_seconds: 0,
			started: 0,
			one_quarter: 0,
			half: 0,
			threequarters: 0,
			completed: 0,
		};

		// Computation copied from scripts/v2_log_reader/tbstats/playstatistic.py
		for (const e of events) {
			playStat.played_seconds += e.timeplayed / 1000;

			// Calculate the fraction completed. Note: at launch, the TB reported a completed play as less than the
			// total time. Observed values are between 97% and 99.2% of the actual play. If the "played" is within
			// 2 seconds of "duration", we'll call it "completed".
			if (e.timeplayed > e.totaltime - 2000) {
				playStat.completed += 1;
			} else if (e.timeplayed > (e.totaltime - 2000) * 0.75) {
				playStat.threequarters += 1;
			} else if (e.timeplayed > (e.totaltime - 2000) * 0.5) {
				playStat.half += 1;
			} else if (e.timeplayed > (e.totaltime - 2000) * 0.25) {
				playStat.one_quarter += 1;
			} else if (e.timeplayed > 2000) {
				playStat.started += 1;
			}
		}

		return playStat;
	}

	private getRevisionPath(metadata: DeploymentMetadata) {
		return `${metadata.project.code}/TB-Loaders/published/${metadata.revision}`;
	}
}
