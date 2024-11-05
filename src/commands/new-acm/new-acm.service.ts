import {
	_Object,
	CopyObjectCommand,
	ListObjectsV2Command,
	S3Client,
} from "@aws-sdk/client-s3";
import { DateTime } from "luxon";
import { Command, Console } from "nestjs-console";
import appConfig from "src/app.config";
import { ACMCheckout } from "src/entities/checkout.entity";
import { Deployment } from "src/entities/deployment.entity";
import { OrganisationProgram } from "src/entities/org_program.entity";
import { Organisation } from "src/entities/organisation.entity";
import { Program } from "src/entities/program.entity";
import { Project } from "src/entities/project.entity";
import { ProgramSpecService } from "src/programs/spec/spec.service";
import { DataSource, In, Not, EntityManager } from "typeorm";

interface Options {
	parentOrg: string | "Amplio";
	name: string;
	programCode: string;
	org: string;
	salesforceId?: string;
	dryRun?: boolean;
}

@Console()
export class NewAcmService {
	constructor(
		private specService: ProgramSpecService,
		private dataSource: DataSource,
	) {}

	@Command({
		command: "new-acm",
		description: "Creates a new ACM",
		options: [
			{
				flags: "-n, --name <value>",
				required: true,
				description: "What the customer calls the program.",
			},
			{
				flags: "--program-code, <value>",
				required: true,
				description: "The project code",
			},
			{
				flags: "-o, --org <value>",
				required: true,
				description: "The customer running or sponsoring the program.",
			},
			{
				flags: "--parent-org <value>",
				required: true,
				description: "The program's organization's parent.",
				defaultValue: "Amplio",
			},
			{
				flags: "--salesforce-id <value>",
				required: true,
				description: "The program's organization's parent.",
				defaultValue: "Amplio",
			},
			{
				flags: "--dry-run",
				required: false,
				description: "Don't update anything.",
			},
		],
	})
	async createAcm(opts: Options): Promise<void> {
		console.log(`\nCreating entries for ${opts.programCode}.\n`);

		let ok = true;
		await this.dataSource.manager.transaction(async (manager) => {
			ok = await this.createOrganisationRecord(opts, manager);
			if (ok) {
				ok = await this.createProjectRecord(opts, manager);
			}
			if (ok) {
				ok = await this.createProgramRecords(opts, manager);
			}
			if (ok) {
				ok = await this.create_and_populate_s3_object(opts);
			}
			if (ok) {
				ok = await this.create_checkout(opts, manager);
			}
		});

		if (ok) {
			ok = await this.publishSpec(opts);
		}
	}

	private async create_checkout(opts: Options, manager: EntityManager) {
		process.stdout.write(
			`Looking for '${opts.programCode}' checkout record in dynamoDb...`,
		);
		const ok = await ACMCheckout.exists({
			where: { project: { code: opts.programCode } },
		});
		if (ok) {
			console.log(`\n  Checkout record exists for ${opts.programCode}`);
			return true;
		}

		if (opts.dryRun === true) {
			console.log("Dry run: would have created checkout record");
			return true;
		}

		await manager.query(
			"INSERT INTO acm_checkout(project_id, acm_state, last_in_file_name, last_in_name, last_in_contact, last_in_date, last_in_version, acm_comment) VALUES ((SELECT _id FROM projects WHERE projectcode = $1 LIMIT 1), $2, $3, $4, $5, $6, $7, $8)",
			[
				opts.programCode,
				"CHECKED_IN",
				"db1.zip",
				"lawrence",
				"techsupport@amplio.org",
				DateTime.now().toISO(),
				"c202002160",
				"Created ACM",
			],
		);

		console.log("ok");
		return true;
	}

	private async publishSpec(opts: Options): Promise<boolean> {
		process.stdout.write(
			`Publishing program spec for '${opts.programCode}'....`,
		);

		if (opts.dryRun === true) {
			console.log("Dry run: would have publish spec on s3");
			return true;
		}

		await this.specService.publish({
			code: opts.programCode.trim(),
			email: "lawrence@amplio.org",
		});

		console.log("ok");
		return true;
	}

	private async createProgramRecords(
		opts: Options,
		manager: EntityManager,
	): Promise<boolean> {
		console.log(`Creating program record for '${opts.programCode}'....`);

		const project = (await Project.findOne({
			where: { code: opts.programCode },
		}))!;

		// Use 'TEST' project as the base template, and create new program from it
		const template = await Program.findOne({ where: { program_id: "TEST" } });
		if (template == null) {
			console.log(
				`\n   'TEST' program which will be used a template do not exists!`,
			);
			return false;
		}

		if (opts.dryRun) {
			console.log("\n   Dry run: would have created program record");
			return true;
		}

		const exists = await Program.exists({
			where: { program_id: project.code },
		});
		if (exists) {
			console.log(
				`\n   Program record for '${opts.programCode}' already exists.`,
			);
			return true;
		}

		const program = Program.merge(new Program(), template);
		program.id =
			(await Program.query("SELECT MAX(id) as id FROM programs"))[0].id + 1;
		program.project_id = project._id;
		program.program_id = project.code;
		program.salesforce_id = opts.salesforceId;
		program.deployments_first = new Date();
		await manager.save(Program, program);

		// Create program organisation record
		const programOrg = new OrganisationProgram();
		programOrg.program_id = program.id;
		programOrg.organisation_id = (await Organisation.findOne({
			where: { name: opts.org },
		}))!.id;
		await manager.save(OrganisationProgram, programOrg);

		// Create first deployment record
		const deployment = new Deployment();
		deployment.deploymentname = `${project.code}-${DateTime.now().toFormat("yy")}-1`;
		deployment.deployment = deployment.deploymentname;
		deployment.deploymentnumber = 1;
		deployment.start_date = new Date();
		deployment.project_id = project.code;
		await manager.save(Deployment, deployment);

		console.log("ok");
		return true;
	}

	private async createProjectRecord(
		opts: Options,
		manager: EntityManager,
	): Promise<boolean> {
		process.stdout.write(
			`Creating project record for '${opts.programCode}'....`,
		);

		const exists = await Project.exists({ where: { code: opts.programCode } });
		if (exists) {
			console.log(
				`\n   Program record for '${opts.programCode}' already exists.`,
			);
			return true;
		}

		if (opts.dryRun) {
			console.log("\n   Dry run: would have created project record");
			return true;
		}

		const project = new Project();
		project.code = opts.programCode.trim();
		project.name = opts.name;
		await manager.save(Project, project);

		console.log("ok");
		return true;
	}

	private async createOrganisationRecord(
		opts: Options,
		manager: EntityManager,
	): Promise<boolean> {
		process.stdout.write("Creating organisation entry in database...");
		const exists = await Organisation.exists({
			where: { name: opts.org },
		});

		if (exists) {
			console.log(`\n   Organisation record for '${opts.org}' already exists.`);
			return true;
		}

		let parentId: number | undefined = undefined;
		if (opts.parentOrg !== "Amplio" && opts.parentOrg != null) {
			const parent = await Organisation.findOne({
				where: { name: opts.parentOrg },
			});
			if (parent == null) {
				console.log(`\n   Parent organisation '${opts.parentOrg}' not found.`);
				return false;
			}
			parentId = parent.id;
		}

		if (opts.dryRun) {
			console.log("\n   Dry run: would have created organisation record");
			return true;
		}

		const org = new Organisation();
		org.name = opts.org;
		org.parent_id = parentId;
		await manager.save(Organisation, org);

		console.log("ok");
		return true;
	}

	/**
	 * Checks to see if there is program content in S3 for the given acm.
	 *
	 * @return  {boolean} True if there is no existing program content, False if there is
	 */
	private async create_and_populate_s3_object(opts: Options): Promise<boolean> {
		const { dryRun, programCode } = opts;

		process.stdout.write(
			`Looking for program '${programCode}' content objects in s3...`,
		);

		const client = new S3Client({ region: appConfig().aws.region });
		const resp = await client.send(
			new ListObjectsV2Command({
				Bucket: appConfig().buckets.content,
				Prefix: `${programCode}/`,
			}),
		);

		if ((resp?.Contents ?? []).length > 0) {
			console.log();
			console.log(`\n  Found program content objects for  '${programCode}'.`);
			return true;
		}
		console.log("ok");

		if (dryRun) {
			console.log("Dry run: would have created content objects.");
			return true;
		}

		// Copy content from ${content_bucket}/template to ${content_bucket}/${program_name}
		try {
			process.stdout.write(
				`Creating and populating s3 folder for ${programCode}...`,
			);

			const contents = await this._list_objects({
				bucket: appConfig().buckets.content,
				prefix: "template/",
				client: client,
			});
			for (const obj of contents) {
				await client.send(
					new CopyObjectCommand({
						Bucket: appConfig().buckets.content,
						CopySource: `${appConfig().buckets.content}/${obj.Key}`,
						Key: `${programCode}/${obj.Key!.slice(9)}`,
					}),
				);
			}
			console.log("ok");
			return true;
		} catch (ex) {
			console.log(`Exception copying template acm: ${ex}`);
			console.error(ex);
			return false;
		}
	}

	private async _list_objects(opts: {
		bucket: string;
		prefix?: string;
		client: S3Client;
		objs?: _Object[];
		token?: string;
	}): Promise<_Object[]> {
		const objs: _Object[] = opts.objs ?? [];

		const resp = await opts.client.send(
			new ListObjectsV2Command({
				Bucket: appConfig().buckets.content,
				Prefix: opts.prefix ?? "template/",
				ContinuationToken: opts.token,
			}),
		);
		if (resp.ContinuationToken != null && resp.IsTruncated) {
			console.log("Truncated response");
			return await this._list_objects({
				bucket: opts.bucket,
				prefix: opts.prefix,
				client: opts.client,
				objs: objs,
			});
		}

		for (const obj of resp.Contents ?? []) {
			objs.push(obj);
		}

		return objs;
	}
}
