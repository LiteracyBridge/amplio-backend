import { BadRequestException, Injectable } from "@nestjs/common";
import { tmpdir } from "node:os";
import { DataSource } from "typeorm";
import fs from "node:fs";
import appConfig from "src/app.config";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "src/utilities";
// import { parse, stringify } from "yaml";

@Injectable()
export class CustomSurveyReportService {
	constructor(private dataSource: DataSource) {}

	async run(dto: {
		programid: string;
		survey: string;
	}) {
		// Executes the user's query in a transaction, and rolls back the transaction
		// to prevent any changes to the database.
		const queryRunner = this.dataSource.createQueryRunner();
		await queryRunner.connect();
		await queryRunner.startTransaction();

		try {
			// Generate crosstab view
			await queryRunner.query("SELECT generate_survey_crosstab_view($1, $2)", [
				dto.programid,
				dto.survey,
			]);

			let report: any[] = await queryRunner.query(`
        SELECT
          r.communityname AS "Community",
          r.groupname AS "Group",
          r.district AS "District",
          r.language AS "Language",
          r.region AS "Region",
          ctv.*
        FROM ct_view ctv
        INNER JOIN surveys ss on ss.survey_uuid = ctv.survey_uuid
        INNER JOIN recipients r ON r.recipientid = ss.recipientid;
      `);

			if (report.length > 0) {
				const parts = await this.parseSurveyContents(dto);

				// Parse the generated report and replace q1, q2... with the corresponding message titles
				report = report.map((row) => {
					for (const p of parts) {
						row[p.message] = row[p.question]; // Assign value to new key
						delete row[p.question]; // Remove the old key
					}

					delete row.survey_uuid;

					return row;
				});
			}

			// console.log(report);

			await queryRunner.rollbackTransaction();

			return report;
		} catch (_err) {
			console.log(_err);
		} finally {
			await queryRunner.release();
		}
	}

	async parseSurveyContents(dto: { programid: string; survey: string }) {
		// Download survey file and extract message titles associated with each question
		const destinationDir = `${tmpdir()}/custom-surveys`;
		if (!fs.existsSync(destinationDir)) {
			fs.mkdirSync(destinationDir);
		}

		const filePath = `${destinationDir}/${dto.programid}-${dto.survey}.survey`;

		if (!fs.existsSync(filePath)) {
			const command = new GetObjectCommand({
				Bucket: appConfig().buckets.content,
				Key: `${dto.programid}/programspec/SatisfactionSurvey.survey`,
			});
			const response = await s3Client().send(command);

			const stream = response.Body as NodeJS.ReadableStream;
			const writeStream = fs.createWriteStream(filePath);
			await new Promise((resolve, reject) => {
				stream.pipe(writeStream);
				stream.on("end", resolve);
				stream.on("error", reject);
			});
		}

		// Parse survey yaml file
		// const yaml = await parse(filePath);
		const yaml = fs.readFileSync(filePath, { encoding: "utf-8" });

		const regex = new RegExp(
			"(?<question>q\\d{1,})" + // Question number -> q1, q2, ..., qn
				"(?:\\:[\\W\\s]+Prompt\\:[\\s]+)" + // Skip "Prompt:"
				"(?<message>[\\w\\s]+)\\r?\\n", // message title
			"gmi",
		);

		const parts: { question: string; message: string }[] = [];

		while (true) {
			const match = regex.exec(yaml)!;
			if (match == null) break;

			parts.push(match.groups as { question: string; message: string });
		}

		return parts;
	}
}
