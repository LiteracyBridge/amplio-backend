import { Body, Controller, Delete, Get, NotFoundException, Param, Post, Query } from '@nestjs/common';
import { Analysis } from 'src/entities/analysis.entity';
import { ApiResponse } from 'src/utilities/api_response';
import { SurveyService } from '../surveys/survey.service';
import { Survey } from 'src/entities/survey.entity';
import { UserFeedbackMessage } from 'src/entities/uf_message.entity';
import { Recipient } from 'src/entities/recipient.entity';
import { ContentMetadata } from 'src/entities/content_metadata.entity';
import { AnalysisChoice } from 'src/entities/analysis_choice.entity';
import { AnalysisDto, AnalysisService } from './analysis.service';

@Controller('analysis')
export class AnalysisController {
  constructor(private analysisService: AnalysisService) { }

  @Get(":survey_id/analysis")
  async getAnalysis(
    @Param('survey_id') surveyId: number,
  ) {
    return ApiResponse.Success({
      data: await Analysis.find({
        where: { question: { survey_id: surveyId } }
      })
    })
  }

  @Get(":survey_id/submissions")
  async getAnalysedMessages(
    @Param('survey_id') surveyId: number,
    @Query('deployment') deployment: string,
    @Query('language') language: string,
  ) {
    const survey = await Survey.findOne({ where: { id: surveyId } })
    if (survey == null) {
      throw new NotFoundException('Survey not found')
    }

    const result = await UserFeedbackMessage.createQueryBuilder("uf_messages")
      .where("uf_messages.programid = :program", { program: survey.project_code })
      .andWhere("uf_messages.deploymentnumber = :deployment", { deployment })
      .andWhere("uf_messages.language = :language", { language })
      .andWhereExists(Analysis
        .createQueryBuilder("uf_analysis")
        .where("uf_analysis.message_uuid = uf_messages.message_uuid")
      )
      .orderBy("uf_messages.message_uuid")
      .leftJoinAndMapOne("uf_messages.recipient", Recipient, "recipient")
      .leftJoinAndMapOne("uf_messages.content_metadata", ContentMetadata, "content_metadata")
      .getMany()

    return ApiResponse.Success({ data: result })
  }

  @Delete(":survey_id/submissions/:message_id")
  async deleteSubmission(
    @Param('survey_id') surveyId: number,
    @Param('message_id') messageId: number,
  ) {
    const results = await Analysis.find({
      where: { question: { survey_id: surveyId } }
    })

    for (const result of results) {
      await result.softRemove();

      const choices = await AnalysisChoice.find({ where: { analysis_id: result.id } })
      await AnalysisChoice.softRemove(choices)
    }

    return ApiResponse.Success({ data: [] })
  }

  @Post(":survey_id")
  async saveOrCreate(
    @Param('survey_id') surveyId: number,
    @Body() dto: AnalysisDto
  ) {
    return ApiResponse.Success({ data: await this.analysisService.createOrUpdate(surveyId, dto) })
  }
}
