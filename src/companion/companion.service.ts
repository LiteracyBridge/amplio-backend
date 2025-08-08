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
import { zipDirectory, unzipFile, s3Sync } from "src/utilities";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
	S3Client,
	GetObjectCommand,
	PutObjectCommand,
} from "@aws-sdk/client-s3";
import { CompanionStatisticsDto, RecipientDto } from "./companion.dto";
import { PlayedEvent } from "src/entities/played_event.entity";
import { DateTime } from "luxon";
import { isNotEmpty } from "class-validator";
import { groupBy, isNonNullish } from "remeda";
import { PlayStatistic } from "src/entities/playstatistics.entity";
import { TalkingBookLoaderId } from "src/entities/tbloader-ids.entity";
import path from "node:path";
import { UserFeedbackMessage } from "src/entities/uf_message.entity";
import { Deployment } from "src/entities/deployment.entity";
import { RecipientMetadata } from "src/entities/recipient-metadata.entity";

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

	async saveRecipientInformation(dto: RecipientDto) {
		const recipient = await Recipient.findOne({
			where: { id: dto.recipientId },
		});

		if (recipient == null) {
			throw new NotFoundException("Recipient cannot be found");
		}

		await RecipientMetadata.createQueryBuilder()
			.insert()
			.values({
				name: dto.name.trim(),
				gender: dto.gender.trim(),
				age: dto.age,
				recipientId: dto.recipientId,
				// number_of_people: dto.numberOfPeople,
			})
			.orIgnore()
			.execute();

		return { saved: true };
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
		if (metadata.acm_metadata.systemPrompts[language] == null) {
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

		const bucket = `s3://${appConfig().buckets.content}`;

		// Download system prompts
		const key = `${this.getRevisionPath(metadata)}/system-prompts/${language}/`;
		const output1 = await s3Sync({
			s3Key: `${bucket}/${key}/`,
			destinationDir: promptsDir,
		});
		console.log("downloaded system prompts:", output1);

		// Download playlist prompts
		const key2 = `${this.getRevisionPath(metadata)}/contents/${language}/playlist-prompts/`;
		const output = await s3Sync({
			s3Key: `${bucket}/${key2}/`,
			destinationDir: promptsDir,
		});
		console.log("downloaded playlist prompts:", output);

		// Download ebo prompts
		const output2 = await s3Sync({
			s3Key: `${bucket}/ebo-prompts/${language}`,
			destinationDir: `${promptsDir}/ebo/`,
		});
		console.log("downloaded ebo prompts:", output2);

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

		const msg = contents.messages.find((m) => m.contentId === contentId);
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
			for (const stat of statistics) {
				const timestamp = DateTime.fromISO(stat.timestamp);
				const recipient = (await Recipient.findOne({
					where: { program_id: stat.projectCode, id: stat.recipientId },
				}))!;
				const event = new PlayedEvent();
				event.talkingbookid = stat.deviceName;
				event.cycle = 0;
				event.updateinyear = 0;
				event.dayinperiod = timestamp.day;
				event.year = timestamp.year;
				event.timeinday = timestamp.toISOTime({ extendedZone: false })!;
				event.timeplayed = stat.listenedDuration;
				event.totaltime = stat.audioDuration;
				event.percentdone = stat.listenedDuration / stat.audioDuration;
				event.isfinished = event.percentdone >= 1;
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

				await manager
					.createQueryBuilder()
					.insert()
					.into(PlayedEvent)
					.values(event)
					.orIgnore()
					.execute();
			}
		});

		// Generate play statistic
		const contentPackageNames: Set<string> = new Set(
			statistics.map((s) => `${s.contentId}-->${s.packageName}`),
		);

		for (const identifier of contentPackageNames) {
			const [contentId, packageName] = identifier.split("-->"); // --> was chosen because package name contains '-'

			const item = statistics.find(
				(s) => s.contentId === contentId && s.packageName === packageName,
			)!;

			const tbId = await this.getTBLoaderID({
				projectCode: item.projectCode,
				deploymentName: item.deploymentName,
			});

			const playEvents = await PlayedEvent.getRepository().manager.query<
				{
					timeplayed: number;
					village: string;
					talkingbookid: string;
				}[]
			>(
				`
        SELECT
          SUM(timeplayed) AS timeplayed,
          village,
          talkingbookid
        FROM
          "playedevents"
        WHERE
          contentid = $1
          AND talkingbookid = $2
          AND packageid = $3
        GROUP BY
          village,
          talkingbookid
        `,
				[contentId, item.deviceName, item.packageName],
			);

			const groupedEvents = groupBy(
				playEvents,
				(p) => `${p.village}-${p.talkingbookid}`,
			);
			for (const key in groupedEvents) {
				const events: PlayedEvent[] = groupedEvents[key];

				const playStat =
					(await PlayStatistic.findOne({
						where: {
							contentid: item.contentId,
							contentpackage: item.packageName,
							community: events[0].village,
							project: item.projectCode,
							talkingbookid: events[0].talkingbookid,
						},
					})) ?? new PlayStatistic();

				playStat.timestamp = DateTime.now().toISO();
				playStat.project = item.projectCode;
				playStat.deployment = item.deploymentName;
				playStat.contentpackage = item.packageName;
				playStat.talkingbookid = events[0].talkingbookid;
				playStat.contentid = item.contentId;
				playStat.community = events[0].village;
				playStat.tbcdid = tbId.hex_id;

				const played = this.computePlayedStats(events);
				playStat.played_seconds = Math.round(played.played_seconds);
				playStat.started = played.started;
				playStat.one_quarter = played.one_quarter;
				playStat.half = played.half;
				playStat.threequarters = played.threequarters;
				playStat.completed = played.completed;

				if (playStat._id == null) {
					await playStat.save();
				} else {
					await PlayStatistic.update({ _id: playStat._id }, playStat);
				}
			}
		}
	}

	/**
	 * Saves user feedback messages to database and S3
	 *
	 * The incoming file is a zip of *.m4a* (audio recording) and *.json* (metadata) files.
	 * Each audio file has an associated json metadata file with same file name (UUID string).
	 * Eg.  2fca9762-dce5-40af-ad1e-22b07af937f1.json -> metadata
	 *      2fca9762-dce5-40af-ad1e-22b07af937f1.m4a  -> audio
	 *
	 * The audio is uploaded to S3 and metadata saved to uf_messages table.
	 */
	async saveUserFeedback(file: Express.Multer.File) {
		interface Metadata {
			id: number;
			uuid: string;
			content_id?: string;
			created_at: string;
			path: string;
			recipient_id: string;
			device: string;
			program_code: string;
			deployment_name: string;
			deployment_number: number;
			package_name?: string;
			synced: boolean;

			/**
			 * Duration in seconds
			 */
			duration: number;
		}

		const destination = path.join(
			os.tmpdir(),
			`userfeedback-${DateTime.now().toUnixInteger()}`,
		);
		await unzipFile({ path: file.buffer, destination });
		const files: string[] = fs.readdirSync(destination);
		console.log(files);

		// Group files by (audio, metadata) by the file name
		const grouped = groupBy(files, (f) => f.replace(/\.(json|m4a)/, ""));
		const collectionTime = DateTime.now().toISO();
		const AUDIO_EXT = ".m4a";

		// Tracks Ids of saved feedbacks
		const savedFeedback: string[] = [];

		for (const key in grouped) {
			const audioName = grouped[key].find((a) => a.endsWith(AUDIO_EXT));
			const audioPath = `${destination}/${audioName}`;

			// No need to store metadata if audio is not found
			if (audioName == null) {
				continue;
			}

			let jsonFile = grouped[key].find((a) => a.endsWith(".json"));

			// If metadata is not found, we assume the messages belongs to the same recipient/deployment
			// and message (hopefully but could be wrong).
			// Lookup for metadata of another audio and use it.
			if (jsonFile == null) {
				jsonFile = files.find((a) => a.endsWith(".json"));
				if (jsonFile == null) {
					// All hope is lost at this point, ignore the audio
					continue;
				}
			}

			const json: Metadata = JSON.parse(
				fs.readFileSync(`${destination}/${jsonFile}`, { encoding: "utf-8" }),
			);

			const recipient = await Recipient.findOne({
				where: { id: json.recipient_id, program_id: json.program_code },
			});
			if (recipient == null) continue;

			const deploymentMeta = (await DeploymentMetadata.findOne({
				where: {
					project: { code: json.program_code },
					deployment: {
						deploymentname: json.deployment_name,
						deploymentnumber: json.deployment_number,
					},
				},
				relations: { user: true },
			}))!;

			const isDuplicate =
				(await UserFeedbackMessage.findOne({
					where: { message_uuid: json.uuid, program_id: json.program_code },
				})) != null;

			if (isDuplicate) {
				savedFeedback.push(json.uuid);
				// TODO: check if file exists on s3, if not upload
				continue;
			}

			await UserFeedbackMessage.createQueryBuilder()
				.insert()
				.values({
					message_uuid: json.uuid,
					program_id: json.program_code,
					deployment_number: json.deployment_number.toString(),
					language: recipient.language,
					length_seconds: json.duration,
					length_bytes: fs.statSync(audioPath).size,
					recipient_id: json.recipient_id,
					relation: json.content_id,
					collection_timestamp: collectionTime,
					date_recorded: DateTime.fromISO(json.created_at).toJSDate(),
					test_deployment: false,
					deployment_timestamp: deploymentMeta.created_at.toISOString(),
					deployment_user: deploymentMeta.user.email,
					deployment_tbcdid: (
						await this.getTBLoaderID({
							projectCode: json.program_code,
							deploymentName: json.deployment_name,
						})
					).hex_id,
					talkingbookid: json.device,
				})
				// .orIgnore()
				.execute();

			// Save file to s3
			const client = new S3Client({
				region: appConfig().aws.region,
				credentials: {
					accessKeyId: appConfig().aws.accessKeyId!,
					secretAccessKey: appConfig().aws.secretId!,
				},
			});

			// Convert m4a to mp3 with ffmpeg
			const mp3 = audioName.replace(AUDIO_EXT, ".mp3");
			execSync(`${appConfig().ffmpeg} -i ${audioPath} ${destination}/${mp3}`);

			await client.send(
				new PutObjectCommand({
					Bucket: appConfig().buckets.userFeedback,
					Key: `collected/${json.program_code}/${json.deployment_number}/${mp3}`,
					Body: fs.readFileSync(audioPath),
					// Metadata: Object.keys(json),
				}),
			);
			console.log(
				`collected/${json.program_code}/${json.deployment_number}/${mp3}`,
			);
			savedFeedback.push(json.uuid);
		}

		console.log(destination);
		return savedFeedback;
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

	private async getTBLoaderID(opts: {
		projectCode: string;
		deploymentName: string;
	}) {
		// Retrieve tb loader ID
		const [tbId] = await TalkingBookLoaderId.getRepository().manager.query<
			{
				hex_id: string;
			}[]
		>(
			`
      SELECT hex_id FROM tb_loader_ids tb
      INNER JOIN projects p ON p.projectcode = $1
      INNER JOIN deployments dp ON dp.project = p.projectcode AND dp.deploymentname = $2
      INNER JOIN deployment_metadata dm ON
        dm.project_id = p._id AND dm.deployment_id = dp._id
      INNER JOIN users u ON u._id = dm.user_id AND u.email = tb.email
      LIMIT 1
      `,
			[opts.projectCode, opts.deploymentName],
		);

		return tbId;
	}
}
