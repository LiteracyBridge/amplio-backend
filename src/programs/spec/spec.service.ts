import {
	BadRequestException,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import readXlsxFile from "read-excel-file/node";
import { Deployment } from "src/entities/deployment.entity";
import { Language, ProjectLanguage } from "src/entities/language.entity";
import { Message, MessageLanguages } from "src/entities/message.entity";
import { Playlist } from "src/entities/playlist.entity";
import { Program } from "src/entities/program.entity";
import { Project } from "src/entities/project.entity";
import { Recipient } from "src/entities/recipient.entity";
import { User } from "src/entities/user.entity";
import { FindOptionsWhere } from "typeorm";
import { DataSource } from "typeorm";

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
				deployments: { playlists: { messages: true } },
			},
		});

		if (found == null) {
			throw new NotFoundException("Program not found");
		}

		return found;
	}

	async import(file: Express.Multer.File, code: string) {
		const {
			rows: [general],
			errors: errors1,
		} = await readXlsxFile(file.buffer, { // @ts-ignore
			schema: GENERAL_SCHEMA,
			sheet: "General",
		});
		if (errors1.length > 0) {
			throw new BadRequestException(errors1[0].error);
		}

		const { rows: deployments, errors: errors2 } = await readXlsxFile(
			file.buffer,
			{ schema: DEPLOYMENTS_SCHEMA, sheet: "Deployments" },
		);
		if (errors2.length > 0) {
			throw new BadRequestException(errors2[0].error);
		}

		const { rows: contents, errors: err3 } = await readXlsxFile(file.buffer, {
			schema: CONTENT_SCHEMA,
			sheet: "Content",
		});
		if (err3.length > 0) {
			throw new BadRequestException(this.formatParsingError(err3[0]));
		}

		const { rows: recipients, errors: err4 } = await readXlsxFile(file.buffer, {
			schema: RECIPIENT_SCHEMA,
			sheet: "Recipients",
		});
		if (err4.length > 0) {
			throw new BadRequestException(this.formatParsingError(err4[0]));
		}

		const { rows: languages, errors: err5 } = await readXlsxFile(file.buffer, {
			schema: LANGUAGE_SCHEMA,
			sheet: "Languages",
		});
		if (err5.length > 0) {
			throw new BadRequestException(this.formatParsingError(err5[0]));
		}

		// Save to db
		await this.dataSource.manager.transaction(async (manager) => {
			const program = await manager.findOne(Program, {
				where: { program_id: code },
			});
			const allDeployments = await manager.find(Deployment, {
				where: { project_id: general.program_id as string },
			});

			if (program == null) {
				throw new NotFoundException(
					`Program '${general.program_id}' cannot not found`,
				);
			}

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
			general.languages = languages.flatMap((i) => i.code);
			general.program_id = program.program_id;
			general.project_id = program.project_id;
			await manager.upsert(Program, general, ["program_id"]);

			// Save deployments
			await manager.upsert(
				Deployment,
				deployments.map((row) => {
					row.project_id = program.program_id;
					row.deploymentname = row.deployment;
					return row;
				}) as unknown as Deployment[],
				["project", "deployment"],
			);

			// Save content
			//
			// Playlists
			await manager
				.createQueryBuilder()
				.insert()
				.into(Playlist)
				.values(
					contents.map((row, index) => {
						const item = new Playlist();
						item.title = row.playlist_title as string;
						item.program_id = program.program_id;
						item.deployment_id = allDeployments.find(
							(i) => i.deploymentnumber === row.deployment_number,
						)!.id;
						item.position = index + 1;
						item.audience = row.audience as string;
						return item;
					}),
				)
				.orIgnore()
				.execute();

			// Messages
			const playlists = await Playlist.find({
				where: { program_id: program.program_id },
				relations: { deployment: true },
				select: {
					deployment: { deploymentnumber: true },
				},
			});
			await manager
				.createQueryBuilder()
				.insert()
				.into(Message)
				.values(
					contents.map((row, index) => {
						const item = new Message();
						item.title = row.message_title as string;
						item.program_id = program.program_id;
						item.playlist_id = playlists.find(
							(i) =>
								i.title === row.playlist_title &&
								i.deployment.deploymentnumber === row.deployment_number,
						)!.id;
						item.position = index + 1;
						item.format = row.format as string;
						item.default_category_code = row.default_category as string;
						item.variant = row.variant as string;
						item.key_points = row.key_points as string;
						item.sdg_goal_id = row.sdg_goals as number;
						item.sdg_target_id = row.sdg_targets as string;
						return item;
					}),
				)
				.orIgnore()
				.execute();

			// Message languages

			// First, we need to make sure that all message languages are captured on the "Languages" sheet
			const set1 = new Set<string>(
				languages.flatMap((row) => row.code as string),
			);

			const messages = await Message.find({
				where: { program_id: program.program_id },
				relations: { playlist: { deployment: true } },
				select: {
					playlist: { title: true, deployment: { deploymentnumber: true } },
				},
			});
			await manager
				.createQueryBuilder()
				.insert()
				.into(MessageLanguages)
				.values(
					contents.flatMap((row, index) => {
						const msg = messages.find(
							(m) =>
								m.title === row.message_title &&
								m.playlist.title === row.playlist_title &&
								m.playlist.deployment.deploymentnumber ===
									row.deployment_number,
						);

						return (row.languages as string[]).map((code) => {
							if (!set1.has(code)) {
								throw new BadRequestException(
									`Language code '${code}' of '${msg?.title}' message not found in the 'Languages' sheet`,
								);
							}

							const item = new MessageLanguages();
							item.language_code = code;
							item.message_id = msg!.id;
							return item;
						});
					}),
				)
				.orIgnore()
				.execute();

			// Save recipients
			await manager
				.createQueryBuilder()
				.insert()
				.into(Recipient)
				.values(
					recipients.map((row, index) => {
						row.program_id = program.program_id;

						if (row.recipient_id == null || row.recipient_id === "") {
							delete row.recipient_id;
						}

						if (!set1.has(row.language as string)) {
							throw new BadRequestException(
								`Language code '${row.language}' of recipient on row '${index + 1}' not found in the 'Languages' sheet`,
							);
						}

						return row as unknown as Recipient;
					}),
				)
				.orIgnore()
				.execute();

			// console.log(messages);
			// insert message languages
			// recipiuents
			// as unknown as Playlist[], {
			//   conflictPaths: ['title', 'deployment_id', 'program_id'],
			//   skipUpdateIfNoValuesChanged: true
			// }
			// )

			// await manager.upsert(Message, contents.map((row, index) => {
			//   const item = new Playlist()
			//   item.title = row.playlist_title as string
			//   item.program_id = program.program_id
			//   item.deployment_id = allDeployments.find(i => i.deploymentnumber === row.deployment_number)?.id
			//   item.position = index + 1
			//   item.audience = row.audience as string
			//   return item
			// }) as unknown as Playlist[], ['title', 'deployment_id', 'program_id'])
		});
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
		console.log(err);
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
	"# HH": { prop: "num_households", type: Number, required: false },
	"# TBs": { prop: "num_tbs", type: Number, required: false },
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
		type: (value) =>
			parseJson(
				value,
				"The format of 'Deployment' column in 'Recipient' workbook is wrong",
			),
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
				return value.split(",").map((v) => v.trim());
			} catch (error) {
				throw new BadRequestException(`${error}. ${errorMessageSuffix}`);
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
	"SDG Goals": { prop: "sdg_goals", type: Number, required: false },
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
