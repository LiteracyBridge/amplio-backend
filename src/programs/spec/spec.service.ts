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
import { randomUUID } from "node:crypto";

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
			const allDeployments = await manager
				.getRepository(Deployment)
				.find({ where: { project_id: project.code } });

			// 1. save playlists
			await manager.query("DELETE FROM playlists WHERE program_id=$1", [
				project.code,
			]);

			for (const d of dto.deployments) {
				// Handle playlists data
				for (const pl of d.playlists) {

					// remove  invalid characters from playlists titles
					pl.title = this.sanitazeString(pl.title);

					const deployment = allDeployments.find(
						(d) =>
							d._id === pl.deployment_id ||
							d.id === pl.deployment_id ||
							d.deploymentnumber === +pl.deployment_number,
					);

					const [query, params] = await manager
						.createQueryBuilder()
						.insert()
						.into(Playlist)
						.values({
							...pl,
							id: pl.id,
							program_id: project.code,
							deployment_id: deployment?.id,
							position: pl.position,
							_id: pl?._id ?? randomUUID(),
						})
						.orUpdate(["title", "position"], "playlist_uniqueness_key")
						.returning("id")
						.getQueryAndParameters();

					const [resp] = await manager.query(query, params);

					// handle playlist messages
					// const existingMessageIds = new Set(pl.messages.flatMap((m) => m._id));
					for (const m of pl.messages) {

						// remove invalid characters from the message title
						m.title = this.sanitazeString(m.title);

						m.playlist_id = resp.id;
						m.program_id = project.code;
						m.default_category_code =
							m.default_category_code === "" ? null : m.default_category_code;

						// Remove unnecessary fields
						delete m.audience;

						const insertedMsg = await manager
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
							.returning("id")
							.execute();

						const newLanguages = new Set<string>();
						if (Array.isArray(m.languages)) {
							for (const l of m.languages) {
								// type is like MessageLanguage object, retrieve only the
								if (typeof l === "object") {
									newLanguages.add(l.language_code);
								} else {
									// string
									newLanguages.add(l);
								}
							}
						} else {
							// string
							// biome-ignore lint/complexity/noForEach: <explanation>
							(m.languages?.split(",") ?? []).forEach((l) =>
								newLanguages.add(l.trim()),
							);
						}

						for (const code of newLanguages) {
							if (code === "") continue;

							await manager
								.createQueryBuilder()
								.insert()
								.into(MessageLanguages)
								.values({
									language_code: code as string,
									message_id: insertedMsg.raw[0].id,
								})
								.orIgnore()
								.execute();
						}
					}
				}
			}

			for (const row of dto.recipients) {
				row.id = row.id ?? row.recipientid ?? row.recipient_id;
				row.program_id = project.code;
				row.agent ??= "";
				row.listening_model ??= "";
				row.group_name = row.groupname ?? row.group_name ?? "";
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

				if (!row.support_entity) {
					row.support_entity = '';
				  }

				if (!row.group_size){
					row.group_size = 0; 
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

	async publish(opts: { code: string; email: string }) {
		const project = await this.findByCode(opts.code);

		  // Mark all deployments as published
		  await this.dataSource.manager.update(
			Deployment,
			{ project_id: project.code },
			{ is_published: true },
		  );

		  

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
		// Step 1: Fetch existing deployments from the database
		const existingDeployments = await manager
			.getRepository(Deployment)
			.find({ where: { project_id: program.program_id } });
	
		// Step 2: Loop through request deployments and upsert
		for (const deployment of deployments) {
			// Check if the deployment exists
			const existingDeployment = existingDeployments.find(
				(d) => d.deploymentnumber === deployment.deploymentnumber,
			);
	
			if (existingDeployment) {
				// Update the existing deployment
				console.log("################################################################");
				console.log(`Deployment ${deployment.deploymentnumber} exists, updating...`);
				await manager
					.getRepository(Deployment)
					.update(
						{ _id: existingDeployment._id, project_id: program.program_id },
						{
							deploymentname: deployment.deploymentname,
							start_date: deployment.startdate,
							end_date: deployment.enddate,
							deployment: deployment.deployment
						},
					);
			} else {
				// Insert a new deployment
				console.log("################################################################");
				console.log(`Deployment ${deployment.deploymentnumber} does not exist, inserting...`);
				await manager
					.getRepository(Deployment)
					.insert({
						project_id: program.program_id,
						deploymentnumber: deployment.deploymentnumber,
						deploymentname: deployment.deploymentname,
						start_date: deployment.startdate,
						end_date: deployment.enddate,
						deployment: deployment.deployment,
					});
			}
		}
	
		// Step 3: Delete missing deployments (if needed)	
		const existingDeploymentNumbers = existingDeployments.map((d) => d.deploymentnumber);
		const requestDeploymentNumbers = deployments.map((d) => d.deploymentnumber);
	
		const deploymentsToDelete = existingDeploymentNumbers.filter(
			(number) => !requestDeploymentNumbers.includes(number),
		);
	
		if (deploymentsToDelete.length > 0) {
			await manager
				.getRepository(Deployment)
				.delete({ deploymentnumber: In(deploymentsToDelete), project_id: program.program_id });
	
			console.log("Deleted deployments:", deploymentsToDelete);
		}
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

	private sanitazeString(input: string) {
		const invalidChars = /[^\d\w\s]/g;
		// Replace invalid characters with a space
		return input.replace(invalidChars, ' ');
	}
}
