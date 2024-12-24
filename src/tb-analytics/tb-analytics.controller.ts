import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiResponse } from "src/utilities/api_response";
import { TalkingBookAnalyticsService } from "./tb-analytics.service";
import { Recipient } from "src/entities/recipient.entity";
import { TalkingBookDeployed } from "src/entities/tb_deployed.entity";
import { Deployment } from "src/entities/deployment.entity";
import { UsageQueryService } from "./usage-query.service";

@Controller("tb-analytics")
export class TalkingBookAnalyticsController {
	constructor(
		protected service: TalkingBookAnalyticsService,
		protected usageService: UsageQueryService,
	) {}

	@Get(":program_id/status")
	async status(
		@Param("program_id") programId: string,
		@Query("selector") selector: string | null,
	) {
		const val = selector?.replace(/[-_]+/g, "").toLowerCase();
		return ApiResponse.Success({
			data:
				val === "bytb"
					? await this.service.status_by_tb(programId)
					: await this.service.status_by_deployment(programId),
		});
	}

	@Get(":program_id/installations")
	async deployedByRecipients(@Param("program_id") programId: string) {
		return ApiResponse.Success({
			data: await Recipient.find({
				where: { program_id: programId },
				relations: { talkingbooks_deployed: true },
			}),
		});
	}

	@Get(":program_id/inventory")
	async inventory(@Param("program_id") programId: string) {
		return ApiResponse.Success({
			data: await TalkingBookDeployed.query(
				`
          SELECT DISTINCT
          td.deployment,
          d.deploymentnumber as "deployment_number",
          r.communityname as "community_name",
        COUNT(DISTINCT td.talkingbookid) AS deployed_tbs
      FROM tbsdeployed td
      JOIN recipients r
        ON td.recipientid = r.recipientid
      LEFT OUTER JOIN deployments d
        ON d.project=td.project AND d.deployment = td.deployment
      WHERE td.project = $1
      GROUP BY td.deployment,
          d.deploymentnumber,
          r.communityname
        `,
				[programId],
			),
		});
	}

	@Get(":program_id/usage")
	async usage(
		@Param("program_id") programId: string,
		@Query("columns") columns: string,
		@Query("group") group: string,
		@Query("deployment") deployment: number,
	) {
		return ApiResponse.Success({
			data: await this.usageService.run({
				deployment_number: deployment,
				programid: programId,
				columns,
				group: group ?? '',
			}),
		});
	}
}
