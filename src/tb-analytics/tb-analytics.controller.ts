import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiResponse } from 'src/utilities/api_response';
import { TalkingBookAnalyticsService } from './tb-analytics.service';
import { Recipient } from 'src/entities/recipient.entity';
import { TalkingBookDeployed } from 'src/entities/tb_deployed.entity';
import { Deployment } from 'src/entities/deployment.entity';

@Controller('dashboard-queries')
export class TalkingBookAnalyticsController {
  constructor(protected service: TalkingBookAnalyticsService) { }

  @Get(":program_id/status")
  async status(
    @Param('program_id') programId: string,
    @Query('selector') selector: string | null,
  ) {
    const val = selector?.replace(/[-_]+/g, "").toLowerCase();
    return ApiResponse.Success({
      data: val === "bytb" ? await this.service.status_by_tb(programId) : await this.service.status_by_deployment(programId)
    })
  }

  @Get(":program_id/recipients/:deployment")
  async recipients(
    @Param('program_id') programId: string,
    @Param('deployment') deployment: string,
  ) {
    return ApiResponse.Success({
      data: await Recipient.createQueryBuilder("recipients")
        .where("user.project = :programId", { programId: programId })
        .andWhereExists(TalkingBookDeployed
          .createQueryBuilder("tbsdeployed")
          .where("tbsdeployed.recipientid = recipients.id")
          .andWhere("tbsdeployed.deployment = :deployment", { deployment: deployment })
        )
        .leftJoinAndMapMany("recipients.talkingbooksDeployed", TalkingBookDeployed, "talkingbooksDeployed")
        .leftJoinAndMapOne("recipients.talkingbooksDeployed.deployment", Deployment, "deployment")
        .getMany()
    })
  }
}
