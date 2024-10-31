import {
	BadRequestException,
	Injectable,
	NotFoundException,
	InternalServerErrorException,
} from "@nestjs/common";
import readXlsxFile, { readSheetNames } from "read-excel-file/node";
import { Deployment } from "src/entities/deployment.entity";
import { Language, ProjectLanguage } from "src/entities/language.entity";
import { Message, MessageLanguages } from "src/entities/message.entity";
import { Playlist } from "src/entities/playlist.entity";
import { Program } from "src/entities/program.entity";
import { Project } from "src/entities/project.entity";
import { Recipient } from "src/entities/recipient.entity";
import { User } from "src/entities/user.entity";
import { FindOptionsWhere } from "typeorm";
import { DataSource, In, Not, EntityManager } from "typeorm";
import { Workbook } from "exceljs";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import appConfig from "src/app.config";
import { join } from "node:path";
import { PublishedProgramSpecs } from "src/entities/published_spec.entity";
import { instanceToPlain } from "class-transformer";
import { diff } from "json-diff-ts";
import { Request } from "express";

@Injectable()
export class ProgramSpecService {
	constructor(private dataSource: DataSource) {}

	async findByCode(code: string, user?: User): Promise<Project> {
		const query: FindOptionsWhere<Project> =
			user == null
				? { code: code }
				: {
						code: code,
						program: { users: { user_id: user.id } },
					};

		const found = await Project.findOne({
			where: query,
			relations: {
				general: true,
				recipients: true,
				// deployments: { playlists: { messages: { languages: true } } },
				languages: true,
			},
		});

		if (found == null) {
			throw new NotFoundException("Program not found");
		}

		const deployments = await Deployment.find({
			where: { project_id: found.code },
			relations: { playlists: { messages: { languages: true } } },
			order: {
				playlists: { position: "ASC", messages: { position: "ASC" } },
				deploymentnumber: "ASC",
			},
		});
		found.deployments = deployments;

		return found;
	}

	async updateProgram(
		dto: {
			general: Record<string, any>;
			languages: ProjectLanguage[];
			recipients: Record<string, any>[];
			deployments: Record<string, any>[];
			contents: Record<string, any>[];
		},
		code: string,
	) {
		// TODO: add 'languages' field to request data
		// TODO: make sure request matches the db model
		const project = await this.findByCode(code);
		const languages = new Set<string>(dto.languages.map((i) => i.code));

		await this.dataSource.manager.transaction(async (manager) => {
			// Save general
			// TODO: set languages data from request
			delete dto.general.id;
			dto.general.languages = dto.languages;
			await this.saveGeneralInfo(
				dto.general,
				dto.languages.map((i) => i.code),
				project.general,
				manager,
			);

			// TODO: save languages first
			// Save languages
			const existingLangs = await manager
				.getRepository(ProjectLanguage)
				.find({ where: { projectcode: project.code } });
			for (const l of existingLangs) {
				if (!languages.has(l.code)) {
					await manager.remove(ProjectLanguage, l);
				}
			}

			await manager.upsert(
				ProjectLanguage,
				dto.languages.map((l) => {
					l.projectcode = project.code;
					return l;
				}),
				["code", "name", "projectcode"],
			);

			// Save deployments
			await this.saveDeployments(manager, dto.deployments, project.general);

			//
			// Save Playlists
			//
			const playlists = dto.deployments.flatMap((d) => d.playlists);

			// 1. save new playlists
			for (let i = 0; i < playlists.length; i++) {
				const row = playlists[i];

				await manager.query(
					`
      INSERT INTO "playlists"("program_id", "deployment_id", "position", "title", "audience", "_id")
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT DO NOTHING;`,
					[
						project.code,
						project.deployments.find(
							(i) => i._id === row.deployment_id || i.id === row.deployment_id,
						)?.id,
						i + 1,
						row.title,
						row.audience,
						row._id,
					],
				);
			}

			// 2. delete removed playlists
			await manager.getRepository(Playlist).delete({
				_id: Not(In(Array.from(new Set<string>(playlists.map((i) => i._id))))),
				program_id: project.code,
			});

			//
			// Save messages
			//
			// -- get updated playlist data
			// -- save all messages submitted by the user
			// -- compare uuids (_id) of submitted messages against existing messages in db;
			//     delete db records not found in submitted request

			const updatedPlaylists = await manager.getRepository(Playlist).find({
				where: { program_id: code },
				relations: { messages: true },
			}); // fetch updated playlists
			const existingMessageIds = new Set(
				updatedPlaylists.flatMap((p) => p.messages.flatMap((m) => m._id)),
			);

			const playlistIds = new Set<string | number>([
				...updatedPlaylists.map((i) => i._id),
				...updatedPlaylists.map((i) => i.id),
			]);
			const messages: Record<string, any>[] = [];
			for (const m of playlists.flatMap((p) => p.messages)) {
				if (!playlistIds.has(m.playlist_id)) {
					// playlist has been deleted
					continue;
				}

				const _found = updatedPlaylists.find(
					(p) => p.id === m.playlist_id || p._id === m.playlist_id,
				);
				if (_found == null) {
					throw new BadRequestException(
						`Playlist id cannot be found for '${m.title}' message`,
					);
				}

				m.playlist_id = _found.id;
				m.program_id = project.code;
				m.default_category_code =
					m.default_category_code === "" ? null : m.default_category_code;

				// Remove unnecessary fields
				delete m.audience;

				if (existingMessageIds.has(m._id)) {
					const _m = { ...m };

					// biome-ignore lint/performance/noDelete: <explanation>
					delete _m.languages;

					await manager
						.createQueryBuilder()
						.update(Message)
						.set(_m)
						.where("_id = :id", { id: m._id })
						.execute();
				} else {
					await manager
						.createQueryBuilder()
						.insert()
						.into(Message)
						.values(m)
						.orUpdate(
							[
								"position",
								"title",
								"format",
								"default_category_code",
								"variant",
								"key_points",
								"sdg_goal_id",
								"sdg_target_id",
							],
							["program_id", "playlist_id", "position"],
						)
						.execute();
				}
				messages.push(m);
			}

			// -- delete removed messages
			await manager.getRepository(Message).delete({
				_id: Not(In(messages.map((m) => m._id))),
				program_id: project.code,
			});

			// Save Message languages
			const updatedMessages = await manager.getRepository(Message).find({
				where: { program_id: code },
				relations: { languages: true },
			});

			// Save message languages
			for (const row of messages) {
				const msg = updatedMessages.find(
					(m) => row._id === m._id || m.id === row.id,
				);

				if (msg == null) {
					throw new BadRequestException(
						`Message '${row.title}' differ from what is already in the spec`,
					);
				}

				const newLanguages = new Set<string>(
					(row.languages?.split(",") ?? []).map((l) => l.trim()),
				);
				for (const code of newLanguages) {
					if (code === "") continue;

					const count = msg.languages.filter(
						(l) => l.language_code === code,
					).length;

					if (count === 1) continue; // skip, language already in db

					if (count > 1) {
						// Database have duplicate languages for this message, so we need to do cleanup
						await manager
							.getRepository(MessageLanguages)
							.delete({ language_code: code, message_id: msg.id });
					}

					await manager
						.createQueryBuilder()
						.insert()
						.into(MessageLanguages)
						.values({ language_code: code as string, message_id: msg.id })
						.orIgnore()
						.execute();
				}

				// Also remove languages deleted by the from db
				const deletedLang = msg.languages.filter(
					(l) => !newLanguages.has(l.language_code),
				);
				await manager.getRepository(MessageLanguages).remove(deletedLang);
			}

			for (const row of dto.recipients) {
				row.id = row.id ?? row.recipientid ?? row.recipient_id;
				row.program_id = project.code;
				row.numtbs = Number(row.numtbs ?? 0);
				row.numhouseholds = Number(row.numhouseholds ?? 0);
				row.direct_beneficiaries_additional ??= {};

				if (!languages.has(row.language as string)) {
					const index = dto.recipients.findIndex((r) => r.id === row.id);
					throw new BadRequestException(
						`Language code '${row.language}' of recipient on row '${index + 1}' not found in the 'Languages' sheet`,
					);
				}

				if (row.id == null || row.id === "") {
					row.id = Recipient.generateId(row as any);
				}

				// Save recipients
				const [query, params] = await manager
					.createQueryBuilder()
					.insert()
					.into(Recipient)
					.values(row as unknown as Recipient)
					.orUpdate(
						[
							"language",
							"numtbs",
							"numhouseholds",
							"direct_beneficiaries_additional",
							"listening_model",
							"indirect_beneficiaries",
							"agent_gender",
							"group_size",
							"groupname",
							"region",
							"country",
							"district",
							"partner",
							"communityname",
							"agent",
							"variant",
							"supportentity",
						],
						"recipients_pkey",
					)
					.getQueryAndParameters();

				await manager.query(query, params);
			}
		});

		return await this.findByCode(project.code);
	}

	async import(file: Express.Multer.File, code: string, req: Request) {
		console.log(req.file);
		// console.log(req.files);

		// readSheetNames(file.buffer).then((sheetNames) => {
		//   // sheetNames === ['Sheet1', 'Sheet2']
		// })

		const {
			rows: [general],
			errors: errors1,
		} = await readXlsxFile(req.file?.path!, {
			// @ts-ignore
			schema: GENERAL_SCHEMA,
			sheet: "General",
		});
		if (errors1.length > 0) {
			throw new BadRequestException(this.formatParsingError(errors1[0]));
		}

		const { rows: deployments, errors: errors2 } = await readXlsxFile(
			file.buffer,
			{ schema: DEPLOYMENTS_SCHEMA, sheet: "Deployments" },
		);
		if (errors2.length > 0) {
			throw new BadRequestException(this.formatParsingError(errors2[0]));
		}

		const { rows: contents, errors: err3 } = await readXlsxFile(file.path, {
			schema: CONTENT_SCHEMA,
			sheet: "Content",
		});
		if (err3.length > 0) {
			throw new BadRequestException(this.formatParsingError(err3[0]));
		}

		const { rows: recipients, errors: err4 } = await readXlsxFile(file.path, {
			schema: RECIPIENT_SCHEMA,
			sheet: "Recipients",
		});
		if (err4.length > 0) {
			throw new BadRequestException(this.formatParsingError(err4[0]));
		}

		const { rows: languages, errors: err5 } = await readXlsxFile(file.path, {
			schema: LANGUAGE_SCHEMA,
			sheet: "Languages",
		});
		if (err5.length > 0) {
			throw new BadRequestException(this.formatParsingError(err5[0]));
		}

		// Save to db
		const project = await this.findByCode(code);
		await this.dataSource.manager.transaction(
			"READ UNCOMMITTED",
			async (manager) => {
				const program = project.general ?? project.program;
				let allDeployments = project.deployments;

				// Save languages
				await manager.upsert(
					ProjectLanguage,
					languages.map((l) => {
						l.projectcode = program.program_id;
						return l;
					}) as unknown as ProjectLanguage[],
					["code", "name", "projectcode"],
				);

				// Save program info
				await this.saveGeneralInfo(
					general,
					languages.flatMap((i) => i.code as string),
					program,
					manager,
				);

				// Save deployments
				for (const d of deployments) {
					if (
						allDeployments.find((i) => i.deploymentname === d.deployment) ==
						null
					) {
						await this.saveDeployments(manager, [d], program);
					}
				}
				allDeployments = await manager
					.getRepository(Deployment)
					.find({ where: { project_id: program.program_id } });

				//
				// Save content
				//
				// Playlists
				const _contentQuery = contents.map((row, index) => {
					const values = `('${program.program_id}', '${allDeployments.find((i) => i.deploymentnumber === row.deployment_number)?.id}', '${index + 1}', '${row.playlist_title}', '${row.audience}')`;
					return `
        INSERT INTO "playlists"("program_id", "deployment_id", "position", "title", "audience")
        VALUES ${values}
        ON CONFLICT DO NOTHING;`;
				});

				await manager.query(_contentQuery.join("\n"));

				// Messages
				const playlists = await manager.getRepository(Playlist).find({
					where: { program_id: program.program_id },
					relations: { deployment: true },
					select: {
						deployment: { deploymentnumber: true },
					},
				});

				for (let index = 0; index < contents.length; index++) {
					const row = contents[index];

					const pId = playlists.find(
						(i) =>
							i.title === row.playlist_title &&
							i.deployment.deploymentnumber === row.deployment_number,
					)!.id;

					if (row.sdg_goals != null) {
						row.sdg_goal_id = (row.sdg_goals as string).split(
							",",
						)[0] as unknown as number; // pick the first goal if multiple
					}

					const msgQuery = await manager
						.createQueryBuilder(manager.queryRunner)
						.insert()
						.into(Message)
						.values({
							...row,
							default_category_code: row.default_category as string,
							title: row.message_title as string,
							playlist_id: pId,
							position: index + 1,
							// sdg_goal_id: sdgId,
							sdg_target_id: row.sdg_targets as string,
							program_id: program.program_id,
						})
						.orUpdate(
							[
								"position",
								"title",
								"format",
								"default_category_code",
								"variant",
								"key_points",
								"sdg_goal_id",
								"sdg_target_id",
							],
							["program_id", "playlist_id", "position"],
						)
						.getQueryAndParameters();

					// delete existing message record, to prevent insert conflict
					await manager.query(
						"DELETE FROM messages WHERE program_id = $1 AND title = $2 AND playlist_id = $3",
						[program.program_id, row.message_title, pId],
					);
					await manager.query(msgQuery[0], msgQuery[1]);
				}

				// Message languages

				// First, we need to make sure that all message languages are captured on the "Languages" sheet
				const specLanguages: Record<string, string> = {}; // {code: code, name: code}
				for (const row of languages) {
					// @ts-ignore
					specLanguages[row.code] = row.code;
					// @ts-ignore
					specLanguages[row.name] = row.code;
				}

				const messages = await manager.getRepository(Message).find({
					where: { program_id: program.program_id },
					relations: { playlist: { deployment: true } },
					select: {
						playlist: { title: true, deployment: { deploymentnumber: true } },
					},
				});
				const _langQuery = contents.flatMap((row, index) => {
					const msg = messages.find(
						(m) =>
							m.title === row.message_title &&
							m.playlist.title === row.playlist_title &&
							m.playlist.deployment.deploymentnumber === row.deployment_number,
					);

					if (msg == null) {
						throw new BadRequestException(
							`Message '${row.message_title}' differ from what is already in the spec`,
						);
					}

					return (row.languages as string[]).map((code) => {
						if (specLanguages[code] == null) {
							throw new BadRequestException(
								`Language code '${code}' of '${msg?.title}' message not found in the 'Languages' sheet`,
							);
						}

						return `INSERT INTO "message_languages"("language_code", "message_id") VALUES ('${specLanguages[code]}', ${msg.id}) ON CONFLICT DO NOTHING;`;
					});
				});

				await manager.query(_langQuery.join("\n"));

				// Save recipients
				for (let index = 0; index < recipients.length; index++) {
					const row = recipients[index];
					row.program_id = program.program_id;
					row.numhouseholds ??= 0;
					row.support_entity ??= "";
					row.numtbs ??= 0;
					row.group_size ??= 0;
					row.direct_beneficiaries_additional ??= {};

					if (row.recipient_id == null || row.recipient_id === "") {
						delete row.recipient_id;
					}

					if (specLanguages[row.language as string] == null) {
						throw new BadRequestException(
							`Language code '${row.language}' of recipient on row '${index + 1}' not found in the 'Languages' sheet`,
						);
					}

					row.language = specLanguages[row.language as string];
					await manager
						.createQueryBuilder()
						.insert()
						.into(Recipient)
						.values(row as unknown as Recipient)
						.orUpdate(
							[
								"language",
								"numtbs",
								"numhouseholds",
								"direct_beneficiaries_additional",
								"listening_model",
								"indirect_beneficiaries",
								"agent_gender",
								"group_size",
								"groupname",
								"region",
								"country",
								"district",
								"partner",
								"communityname",
								"agent",
								"variant",
								"supportentity",
							],
							"recipients_pkey",
						)
						.execute();
				}
			},
		);
	}

	async publish(opts: { code: string; email: string }) {
		const project = await this.findByCode(opts.code);

		// Save to db
		const recent = await PublishedProgramSpecs.findOne({
			where: { project_id: project._id },
			order: { created_at: "DESC" },
		});
		const tracker = new PublishedProgramSpecs();
		tracker.project_id = project._id;
		tracker.spec = instanceToPlain(project);
		tracker.publisher = opts.email;
		tracker.diff = diff(recent?.spec ?? {}, tracker.spec);
		tracker.previous_id = recent?.id;
		await tracker.save();

		await this.writeToS3({
			email: opts.email,
			xlsx: await this.createExcel(project, false),
			format: "csv",
			projectCode: project.code,
		});
		await this.writeToS3({
			email: opts.email,
			xlsx: await this.createExcel(project),
			format: "xlsx",
			projectCode: project.code,
		});
		return project;
	}

	private async createExcel(project: Project, isExcel: boolean = true) {
		const workbook = new Workbook();
		await workbook.xlsx.readFile(join(__dirname, "template.xlsx"));

		const headers = {
			general: {
				program_id: "Program ID",
				country: "Country",
				region: "Regions",
				languages: "Languages",
				deployments_count: "Deployments Count",
				deployments_length: "Deployments Length",
				deployments_first: "Deployments First",
				listening_models: "Listening Models",
				feedback_frequency: "Feedback Frequency",
				sustainable_development_goals: "Sustainable Development Goals",
				direct_beneficiaries_map: "Direct Beneficiaries Map",
				direct_beneficiaries_additional_map:
					"Direct Beneficiaries Additional Map",
				affiliate: "Affiliate",
				partner: "Partner",
			},
			deployment: {
				deploymentnumber: "Deployment #",
				startdate: "Start Date", // date
				enddate: "End Date", // date
				//  'deployment': 'Deployment',
				deploymentname: "Deployment Name",
			},
			content: {
				deployment_num: "Deployment #",
				playlist_title: "Playlist Title",
				message_title: "Message Title",
				key_points: "Key Points",
				languagecode: "Language Code",
				variant: "Variant",
				format: "Format",
				audience: "Audience",
				default_category: "Default Category",
				sdg_goals: "SDG Goals",
				sdg_targets: "SDG Targets",
			},
			recipient: {
				country: "Country",
				language: "Language Code",
				region: "Region",
				district: "District",
				communityname: "Community",
				groupname: "Group Name",
				agent: "Agent",
				variant: "Variant",
				listening_model: "Listening Model",
				group_size: "Group Size",
				numhouseholds: "# HH",
				numtbs: "# TBs",
				supportentity: "Support Entity",
				agent_gender: "Agent Gender",
				direct_beneficiaries: "Direct Beneficiaries",
				direct_beneficiaries_additional: "Direct Beneficiaries Additional",
				indirect_beneficiaries: "Indirect Beneficiaries",
				deployments: "Deployments",
				recipientid: "RecipientID",
				affiliate: "Affiliate",
				partner: "Partner",
				component: "Component",
			},
			languages: { name: "name", code: "code" },
		};
		// Create general sheet
		const generalSheet = workbook.addWorksheet("General");
		generalSheet.columns = Object.keys(headers.general).map((k) => ({
			header: isExcel ? headers.general[k] : k,
			key: k,
		}));
		generalSheet.addRow({
			program_id: project.code,
			country: project.general.country,
			region: project.general.region,
			languages: project.languages.map((l) => l.code),
			deployments_count: project.deployments.length,
			deployments_length: project.general.deployments_length,
			deployments_first: project.general.deployments_first,
			listening_models: project.general.listening_models,
			feedback_frequency: project.general.feedback_frequency,
			sustainable_development_goals:
				project.general.sustainable_development_goals,
			direct_beneficiaries_map: project.general.direct_beneficiaries_map,
			direct_beneficiaries_additional_map:
				project.general.direct_beneficiaries_additional_map,
			affiliate: project.general.affiliate,
			partner: project.general.partner,
		});

		// Create deployments sheet
		const deploymentSheet = workbook.addWorksheet("Deployments");
		deploymentSheet.columns = Object.keys(headers.deployment).map((k) => ({
			header: isExcel ? headers.deployment[k] : k,
			key: k,
		}));
		for (const d of project.deployments) {
			deploymentSheet.addRow({
				deploymentnumber: d.deploymentnumber,
				startdate: d.start_date,
				enddate: d.end_date,
				deploymentname: d.deploymentname,
			});
		}

		// Languages sheet
		const langSheet = workbook.addWorksheet("Languages");
		langSheet.columns = Object.keys(headers.languages).map((k) => ({
			header: isExcel ? headers.languages[k] : k,
			key: k,
		}));
		for (const l of project.languages) {
			langSheet.addRow({ name: l.name, code: l.code });
		}

		// Contents sheet
		const contentSheet = workbook.addWorksheet("Content");
		contentSheet.columns = Object.keys(headers.content).map((k) => ({
			header: isExcel ? headers.content[k] : k,
			key: k,
		}));
		for (const d of project.deployments) {
			for (const p of d.playlists) {
				for (const m of p.messages) {
					contentSheet.addRow({
						deployment_num: d.deploymentnumber,
						playlist_title: p.title,
						message_title: m.title,
						key_points: m.key_points,
						languagecode: m.languages.map((l) => l.language_code).join(","),
						variant: m.variant,
						format: m.format,
						audience: p.audience,
						default_category: m.default_category_code,
						sdg_goals: m.sdg_goal_id, // TODO: read from relation
						sdg_targets: m.sdg_target_id, // TODO: read from relation
					});
				}
			}
		}

		// Recipients sheet
		const recipientSheet = workbook.addWorksheet("Recipients");
		recipientSheet.columns = Object.keys(headers.recipient).map((k) => ({
			header: isExcel ? headers.recipient[k] : k,
			key: k,
		}));
		for (const r of project.recipients) {
			recipientSheet.addRow({
				country: r.country,
				language: r.language,
				region: r.region,
				district: r.district,
				communityname: r.community_name,
				groupname: r.group_name,
				agent: r.agent,
				variant: r.variant,
				listening_model: r.listening_model,
				group_size: r.group_size,
				numhouseholds: r.numhouseholds ?? 0,
				numtbs: r.numtbs,
				supportentity: r.support_entity,
				agent_gender: r.agent_gender,
				direct_beneficiaries: r.direct_beneficiaries,
				direct_beneficiaries_additional: r.direct_beneficiaries_additional,
				indirect_beneficiaries: r.indirect_beneficiaries,
				deployments: r.deployments,
				recipientid: r.id,
				affiliate: r.affiliate,
				partner: r.partner,
				component: r.component,
			});
		}

		return workbook;
	}

	private async writeToS3(opts: {
		comment?: string;
		email: string;
		xlsx: Workbook;
		projectCode: string;
		format: "csv" | "xlsx";
	}) {
		const metadata = {
			"submission-date": new Date().toISOString(),
			"submitter-email": opts.email,
			"submitter-comment": opts.comment || "No comment provided",
		};
		const names = {
			General: "pub_general.csv",
			Deployments: "pub_deployments.csv",
			Content: "pub_content.csv",
			Recipients: "pub_recipients.csv",
			Languages: "pub_languages.csv",
		};

		const client = new S3Client({ region: appConfig().aws.region });
		try {
			// Upload excel file
			if (opts.format === "xlsx") {
				await client.send(
					new PutObjectCommand({
						Bucket: appConfig().buckets.programSpec,
						Key: `${opts.projectCode}/pub_progspec.xlsx`,
						Body: Buffer.from(await opts.xlsx.xlsx.writeBuffer()),
						Metadata: metadata,
					}),
				);
			}

			// Upload csv files
			if (opts.format === "csv") {
				for (const k in names) {
					await client.send(
						new PutObjectCommand({
							Bucket: appConfig().buckets.programSpec,
							Key: `${opts.projectCode}/${names[k]}`,
							Body: Buffer.from(
								await opts.xlsx.csv.writeBuffer({ sheetName: k }),
							),
							Metadata: metadata,
						}),
					);
				}
			}
		} catch (error) {
			throw new InternalServerErrorException(
				"Failed to upload excel file to S3",
			);
		}
	}

	private async saveDeployments(
		manager: EntityManager,
		deployments: Record<string, any>[],
		program: Program,
	) {
		await manager
			.createQueryBuilder()
			.insert()
			.into(Deployment)
			.values(
				deployments.map((row) => {
					row.project_id = program.program_id;
					row.deploymentname = row.deployment;
					return row;
				}) as unknown as Deployment[],
			)
			.orIgnore()
			.execute();
	}

	private async saveGeneralInfo(
		general: Record<string, any>,
		languages: string[],
		program: Program,
		manager: EntityManager,
	) {
		general.program_id ??= program.program_id;
		general.project_id ??= program.project_id;
		general.languages = languages;
		await manager.upsert(Program, general, ["program_id"]);
	}

	private formatParsingError(opts: {
		error: string;
		row: number;
		column: string;
		value?: any;
	}) {
		return `${opts.error} at row ${opts.row}, column ${opts.column} with value '${opts.value}'`;
	}
}

const errorMessageSuffix = "Please correct all errors and re-upload the sheet";
const parseJson = (value: string, error: string) => {
	try {
		return JSON.parse(value.replace(/'/g, '"'));
	} catch (err) {
		throw new BadRequestException(`${error}. ${errorMessageSuffix}`);
	}
};

const LANGUAGE_SCHEMA = {
	name: { prop: "name", type: String, required: true },
	code: { prop: "code", type: String, required: true },
};

const RECIPIENT_SCHEMA = {
	Country: { prop: "country", type: String, required: true },
	Region: { prop: "region", type: String, required: true },
	District: { prop: "district", type: String, required: true },
	Community: { prop: "community_name", type: String, required: false },
	Agent: { prop: "agent", type: String, required: true },
	"Language Code": { prop: "language", type: String, required: true },
	"Group Name": { prop: "group_name", type: String, required: false },
	"Group Size": { prop: "group_size", type: Number, required: false },
	"# HH": { prop: "numhouseholds", type: Number, required: false },
	"# TBs": { prop: "numtbs", type: Number, required: false },
	"Direct Beneficiaries": {
		prop: "direct_beneficiaries",
		type: Number,
		required: false,
	},
	"Indirect Beneficiaries": {
		prop: "indirect_beneficiaries",
		type: Number,
		required: false,
	},
	Variant: { prop: "variant", type: String, required: false },
	"Support Entity": { prop: "support_entity", type: String, required: false },
	"Agent Gender": { prop: "agent_gender", type: String, required: false },
	"Listening Model": { prop: "listening_model", type: String, required: false },
	"Direct Beneficiaries Additional": {
		prop: "direct_beneficiaries_additional",
		required: false,
		type: (value) =>
			parseJson(
				value,
				"The format of 'Direct Beneficiaries Additional' column in 'Recipients' workbook is wrong",
			),
	},
	Affiliate: { prop: "affiliate", type: String, required: false },
	Partner: { prop: "partner", type: String, required: false },
	Components: { prop: "component", type: String, required: false },
	RecipientID: { prop: "recipient_id", type: String, required: false },
	Deployments: {
		prop: "deployments",
		type: (value) => {
			if (Number.isInteger(value)) {
				return [+value];
			}
			return parseJson(
				value,
				"The format of 'Deployment' column in 'Recipient' workbook is wrong",
			);
		},
		required: false,
	},
};

const CONTENT_SCHEMA = {
	"Deployment #": { prop: "deployment_number", type: Number, required: true },
	"Playlist Title": { prop: "playlist_title", type: String, required: true },
	"Message Title": { prop: "message_title", type: String, required: true },
	"Key Points": { prop: "key_points", type: String, required: false },
	"Language Code": {
		required: true,
		prop: "languages",
		type: (value) => {
			try {
				return parseJson(
					value,
					`The format of '${value}' in 'Language Code' column of 'Content' workbook is wrong`,
				); // value in brackets; eg. ["eng", "fr"]
			} catch (error) {
				try {
					return value.split(",").map((v) => v.trim()); // raw strings; eg. en, fr
				} catch {
					throw new BadRequestException(`${error}. ${errorMessageSuffix}`);
				}
			}
		},
	},
	Variant: { prop: "variant", type: String, required: false },
	Format: { prop: "format", type: String, required: false },
	Audience: { prop: "audience", type: String, required: false },
	"Default Category": {
		prop: "default_category",
		type: String,
		required: false,
	},
	"SDG Goals": { prop: "sdg_goals", type: String, required: false },
	"SDG Targets": { prop: "sdg_targets", type: String, required: false },
};

const DEPLOYMENTS_SCHEMA = {
	"Deployment #": { prop: "deploymentnumber", type: Number, required: true },
	"Start Date": { prop: "start_date", type: Date, required: true },
	"End Date": { prop: "end_date", type: Date, required: true },
	"Deployment Name": { prop: "deployment", type: String, required: true },
};

const GENERAL_SCHEMA = {
	"Program ID": { prop: "program_id", type: String, required: true },
	Country: { prop: "country", type: String, required: true },
	Affiliate: { prop: "affiliate", type: String, required: false },
	Partner: { prop: "partner", type: String, required: false },
	Regions: {
		prop: "region",
		type: (value: string) =>
			parseJson(
				value,
				"The format of 'Regions' column in 'General' workbook is wrong",
			),
		required: true,
	},
	// "Languages": {
	//   prop: 'languages',
	//   type: (value) => parseJson(value, "The format of 'Languages' column in 'General' workbook is wrong"),
	//   required: true
	// },
	"Deployments Count": {
		prop: "deployments_count",
		type: Number,
		required: true,
	},
	"Deployments Length": {
		prop: "deployments_length",
		type: String,
		required: true,
	},
	"Deployments First": {
		prop: "deployments_first",
		type: Date,
		required: true,
	},
	"Feedback Frequency": {
		prop: "feedback_frequency",
		type: String,
		required: false,
	},
	"Listening Models": {
		prop: "listening_models",
		type: (value) =>
			parseJson(
				value,
				"The format of 'Listening Models' column in 'General' workbook is wrong",
			),
		required: false,
	},
	"Sustainable Development Goals": {
		prop: "sustainable_development_goals",
		type: (value) =>
			parseJson(
				value,
				"The format of 'Sustainable Development Goals' column in 'General' workbook is wrong",
			),
	},
	"Direct Beneficiaries Map": {
		prop: "direct_beneficiaries_map",
		required: false,
		type: (value) =>
			parseJson(
				value,
				"The format of 'Direct Beneficiaries Map' column in 'General' workbook is wrong",
			),
	},
	"Direct Beneficiaries Additional Map": {
		prop: "direct_beneficiaries_additional_map",
		required: false,
		type: (value) =>
			parseJson(
				value,
				"The format of 'Direct Beneficiaries Additional Map' column in 'General' workbook is wrong",
			),
	},
};
