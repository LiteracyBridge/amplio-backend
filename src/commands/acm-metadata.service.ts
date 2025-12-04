import { _Object } from "@aws-sdk/client-s3";
import { Command, Console } from "nestjs-console";
import { TalkingBookMetadataService } from "src/acm-checkout/talking-book-metadata.service";
import { DataSource } from "typeorm";

interface Options {
	name: string;
	path: string;
}

const METADATA_NAMES = [
	"categories",
	"languages",
	"packages-in-deployment",
	"categories-in-package",
	"content-in-packages",
	"contents-metadata",
];

@Console()
export class ACMMetadataService {
	constructor(
		private service: TalkingBookMetadataService,
		private dataSource: DataSource,
	) {}

	@Command({
		command: "import-acm-metadata",
		description: "Imports ACM metadata into database",
		options: [
			{
				flags: "-n, --name <value>",
				required: true,
				description: `Metadata name: ${METADATA_NAMES.join(", ")}`,
			},
			{
				flags: "-p, --path <value>",
				required: true,
				description: "Path to the metadata file",
			},
		],
	})
	async createAcm(opts: Options): Promise<void> {
		const { name, path } = opts;

		console.log(`\Importing metadata for ${name}.\n`);

		await this.dataSource.manager.transaction(async (manager) => {
			switch (name) {
				case "categories":
					return await this.service.saveCategories(path, manager);
				case "languages":
					return await this.service.saveLanguages(path, manager);
				case "packages-in-deployment":
					return await this.service.savePackagesInDeployment(path, manager);
				case "categories-in-package":
					return await this.service.saveCategoriesInPackage(path, manager);
				case "content-in-packages":
					return await this.service.saveContentInPackages(path, manager);
				case "contents-metadata":
					return await this.service.saveContentsMetadata(path, manager);
				default:
					console.error(`Name must be one of: ${METADATA_NAMES.join(", ")}.`);
			}
		});
	}
}
