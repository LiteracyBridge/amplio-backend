import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiResponse } from "src/utilities/api_response";
import { TalkingBookAnalyticsService } from "./tb-analytics.service";
import { Recipient } from "src/entities/recipient.entity";
import { TalkingBookDeployed } from "src/entities/tb_deployed.entity";
import { Deployment } from "src/entities/deployment.entity";

@Controller("tb-analytics")
export class TalkingBookAnalyticsController {
	constructor(protected service: TalkingBookAnalyticsService) {}

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

	@Get(":program_id/recipients/:deployment")
	async recipients(
		@Param("program_id") programId: string,
		@Param("deployment") deployment: string,
	) {
		return ApiResponse.Success({
			data: await Recipient.createQueryBuilder("recipients")
				.where("recipients.project = :programId", { programId: programId })
				.andWhereExists(
					TalkingBookDeployed.createQueryBuilder("tbsdeployed")
						.where("tbsdeployed.recipientid = recipients.id")
						.andWhere("tbsdeployed.deployment = :deployment", {
							deployment: deployment,
						}),
				)
				.leftJoinAndMapMany(
					"recipients.talkingbooks_deployed",
					TalkingBookDeployed,
					"talkingbooks_deployed",
					'recipients.recipientid = "talkingbooks_deployed".recipientid',
				)
				// .leftJoinAndMapMany(
				//   "uf_messages.analysis",
				//   Analysis,
				//   "analysis",
				//   "uf_messages.message_uuid = analysis.message_uuid",
				// )
				// .leftJoinAndMapOne("recipients.talkingbooksDeployed.deployment", Deployment, "deployment")
				.getMany(),
		});
	}

	@Get(":program_id/installations/:deployment")
	async tbsdeployed(
		@Param("program_id") programId: string,
		@Param("deployment") deployment: string,
		@Param("testing") testing: boolean,
	) {
		const data = {
			recipients: await Recipient.find({
				where: { program_id: programId},
				relations: { talkingbooks_deployed: true },
			}),
			// tbs_deployed: await TalkingBookDeployed.find({
			// 	where: {
			// 		project: programId,
			// 		deployment_name: deployment,
			// 		testing: testing || false,
			// 	},
			// }),
			deployment: await Deployment.findOne({
				where: { project_id: programId, deployment: deployment },
			}),
		};
		return ApiResponse.Success({
			data: data,
		});
	}
}
