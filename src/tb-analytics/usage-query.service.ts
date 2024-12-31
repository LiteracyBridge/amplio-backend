import { BadRequestException, Injectable } from "@nestjs/common";
import { isNonNullish } from "remeda";
import { DataSource } from "typeorm";

const VIEW_QUERY = `
WITH temp_usage AS (
  SELECT * FROM usage_info
  WHERE recipientid IN (SELECT recipientid FROM recipients WHERE project ILIKE $1)
    AND played_seconds > 0
)

`;

const VIEW_QUERY_DEPL = `
WITH temp_usage AS (
  SELECT * FROM usage_info
  WHERE recipientid IN (SELECT recipientid FROM recipients WHERE project ILIKE $1)
    AND played_seconds>0
    AND deploymentnumber = $2
)
`;

const TEMP_VIEW = "temp_usage";

/**
 * This Module validates a query against a set of known columns, and can generate valid SQL equivalent to the query.
 *
 * Class SimpleQueryValidator is instantiated with a list of valid columns. It then can parse a simplified form
 * of SQL against those columns. The query is validated as querying only those columns, with optional aggregations
 * of sum(column) and count(column), optionally divided by sum(column) or count(column). Note that the input is
 * simply "count(column)", but the output is "COUNT(DISTINCT column)". Output columns can be named with
 * "as name", but if omitted aggregated or normalized columns will be given (semi-)meaningful names.
 */

@Injectable()
export class UsageQueryService {
	constructor(private dataSource: DataSource) {}

	async run(opts: {
		programid: string;
		columns: string;
		group: string;
		deployment_number?: number;
		date?: string;
	}) {
		const { programid, deployment_number, columns, group } = opts;

		const keywordRegex =
			/delete|drop|truncate|revoke|grant|rename|update|alter|create|trigger/gim;

		if (keywordRegex.test(columns) || keywordRegex.test(group)) {
			throw new BadRequestException("Invalid query");
		}

		let query = `SELECT DISTINCT ${columns} FROM ${TEMP_VIEW}`;
		if (
			opts.date !== "undefined" &&
			isNonNullish(opts.date) &&
			!keywordRegex.test(opts.date!)
		) {
			query += ` WHERE deployment_timestamp::DATE = '${opts.date}'`;
		}
		if (group.length > 0) {
			query += `\n GROUP BY ${group} ORDER BY ${group};`;
		}

		let results: Record<string, any> = [];

		// Executes the user's query in a transaction, and rolls back the transaction
		// to prevent any changes to the database.
		const queryRunner = this.dataSource.createQueryRunner();
		await queryRunner.connect();
		await queryRunner.startTransaction();

		try {
			if (deployment_number) {
				console.log(
					`Program filter: "${VIEW_QUERY_DEPL}" with: ${programid}, ${deployment_number}`,
				);
				results = await queryRunner.manager.query(VIEW_QUERY_DEPL + query, [
					programid,
					deployment_number,
				]);
			} else {
				results = await queryRunner.manager.query(VIEW_QUERY + query, [
					programid,
				]);
			}

			await queryRunner.rollbackTransaction();
		} finally {
			await queryRunner.release();
		}

		return results;
	}
}
