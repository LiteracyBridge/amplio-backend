import { BadRequestException, Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";

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

			const report = await queryRunner.query(`
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

			console.log(report);

			await queryRunner.rollbackTransaction();

			return report;
		} catch (_err) {
			console.log(_err);
		} finally {
			await queryRunner.release();
		}
	}
}
