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
		command: "import-acm-metadata", description: "Imports ACM metadata into database",
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
			if (name === "categories") {
				await this.service.saveCategories(path, manager);
			}
			if (name === "languages") {
				await this.service.saveLanguages(path, manager);
			}
			if (name === "packages-in-deployment") {
				await this.service.savePackagesInDeployment(path, manager);
			}
			if (name === "categories-in-package") {
				await this.service.saveCategoriesInPackage(path, manager);
			}
			if (name === "content-in-packages") {
				await this.service.saveContentInPackages(path, manager);
			}
			if (name === "contents-metadata") {
				await this.service.saveContentsMetadata(path, manager);
			}
		});
	}
}
