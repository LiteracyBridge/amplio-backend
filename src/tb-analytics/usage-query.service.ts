import { BadRequestException, Injectable } from "@nestjs/common";
import { Deployment } from "src/entities/deployment.entity";
import { DataSource } from "typeorm";

/**
 *A list of the columns that the user may request.
 */
const CHOOSABLE_COLUMNS = [
	"deploymentnumber",
	"deployment",
	"deploymentname",
	"startdate",

	"contentpackage",
	"languagecode",
	"language",

	"partner",
	"affiliate",

	"country",
	"region",
	"district",
	"communityname",
	"groupname",
	"agent",
	"recipientid",
	"talkingbookid",
	"deployment_uuid",

	"category",
	"playlist",
	"sdg_goals",
	"sdg_targets",
	"contentid",
	"title",
	"format",
	"duration_seconds",
	"position",

	"timestamp",
	"deployment_timestamp",

	"played_seconds",
	"completions",
	"threequarters",
	"half",
	"quarter",
	"started",

	"tbcdid",
];

const VIEW_QUERY = `
WITH temp_usage AS (
  SELECT * FROM usage_info
  WHERE recipientid IN (SELECT recipientid FROM recipients WHERE project ILIKE $1)
    AND played_seconds>0
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

const COLUMN_SPEC = new RegExp(
	"^s*" + // ignore case, whitespace
		"(?:(?<agg>count|sum)s*(s*)?" + // optional aggregation
		"(?<col>w+)s*" + // column
		// if aggregated, closing paren
		//'(?(<agg>)\\)\\s*' +
		// Also, if aggregated, optional normalization of aggregation
		"(/((?<norm>count|sum)s*(s*(?<norm_col>w+)s*)))?)" +
		// Optional ' as '
		"(s*ass+(?<as_col>w+)s*)?$/u",
	"ig",
);
// const COLUMN_SPEC = new RegExp(
//   /^\s*(?:(?<agg>count|sum)\s*\(\s*)?(?<col>\w+)\s*(?(<agg>)\)\s*(\/(?<norm>count|sum)\s*\(\s*(?<norm_col>\w+)\s*\)))?(\s*as\s+(?<as_col>\w+)\s*)?$/u,
//   'i'
// );

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
	// private errors: string[] = [];
	private aggs = { count: "COUNT(DISTINCT {})", sum: "SUM({})" };
	private tags = { count: "num_", sum: "" };
	private augment = "sum(completions),sum(played_seconds)";

	// What the result columns are named, column name, decorated by aggregators, or via 'as'
	private names: string[] = [];
	// The non-aggregated columns. Used for 'GROUP BY' and 'ORDER BY'
	private columns: string[] = [];
	// The expressions for each column
	private expressions: string[] = [];

	constructor(private dataSource: DataSource) {}

	async run(opts: {
		programid: string;
		columns: string;
		group: string;
		deployment_number?: number;
	}) {
		const { programid, deployment_number, columns, group } = opts;

		const keywordRegex =
			/delete|drop|truncate|revoke|grant|rename|update|alter|create|trigger/gim;

		if (keywordRegex.test(columns) || keywordRegex.test(group)) {
			throw new BadRequestException("Invalid query");
		}

		let query = `SELECT DISTINCT ${columns} FROM ${TEMP_VIEW}`;
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
				query = VIEW_QUERY_DEPL + query;
				results = await queryRunner.manager.query(query, [
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

	private parseQuery(simple_query: string) {
		// const aggs = { count: "COUNT(DISTINCT {})", sum: "SUM({})" };
		// const tags = { count: "num_", sum: "" };
		// const augment = "sum(completions),sum(played_seconds)";

		// // What the result columns are named, column name, decorated by aggregators, or via 'as'
		// const names: string[] = [];
		// // The non-aggregated columns. Used for 'GROUP BY' and 'ORDER BY'
		// const columns: string[] = [];
		// // The expressions for each column
		// const expressions: string[] = [];
		// // errors = []

		for (const p of simple_query.split(",").concat(this.augment.split(","))) {
			if (!p) continue;

			const m = COLUMN_SPEC.exec(p);
			if (m?.groups) {
				this._Q({
					col: m.groups.col,
					agg: m.groups.agg,
					norm: m.groups.norm,
					norm_col: m.groups.norm_col,
					as_col: m.groups.as_col,
				});
			} else {
				throw new BadRequestException(`Not a select expression: "${p}"`);
			}
		}

		const grouping =
			this.columns.length > 0
				? ` GROUP BY ${this.columns.join(",")} ORDER BY ${this.columns.join(",")}`
				: "";
		const queryStr = `SELECT DISTINCT ${this.expressions.join(",")} FROM ${TEMP_VIEW}${grouping};`;

		return queryStr;
	}

	private _Q(opts: {
		col: string;
		agg?: string;
		norm?: string;
		norm_col?: string;
		as_col?: string;
	}) {
		const { col, agg, norm, norm_col, as_col } = opts;

		if (!CHOOSABLE_COLUMNS.includes(col!)) {
			throw new BadRequestException(`Not column: "${col}"`);
		}

		let name = col; // may be overridden by 'as' or aggregation
		let column_query: string;
		if (!agg) {
			// simple column
			column_query = col;
		} else {
			// aggregated column
			column_query =
				this.aggs[agg].replace("{}", col) +
				(norm ? `/${this.aggs[norm].replace("{}", norm_col || "")}` : "");
		}
		if (as_col) {
			// name specified
			name = as_col;
			column_query += ` AS ${as_col}`;
		} else if (agg) {
			// aggregate name inferred
			name = `${this.tags[agg]}${col}${norm ? `_per_${norm_col}` : ""}`;
			column_query += ` AS ${name}`;
		}

		if (!this.names.includes(name)) {
			if (!agg && !this.columns.includes(col)) {
				this.columns.push(col);
			}
			this.names.push(name);
			this.expressions.push(column_query);
		}

		// return { names, columns, expressions, aggs, tags };
	}
}
