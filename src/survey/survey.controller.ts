import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { SurveyService } from './survey.service';
import { ApiResponse } from 'src/utilities/api_response';
import { Survey, SurveyStatus } from 'src/entities/survey.entity';
import { SurveyDto } from './survey.dto';

@Controller('survey')
export class SurveyController {
  constructor(protected service: SurveyService) { }

  @Get("all/:project")
  async getAll(
    @Param('project') project: string
  ) {
    return ApiResponse.Success({
      data: await Survey.find({
        where: { project_code: project },
        relations: { deployment: true, sections: true, questions: { choices: { sub_options: true } } }
      })
    })
  }

  @Put(':id/status')
  async changeStatus(
    @Param('id') id: number,
    @Body("status") status: string
  ) {
    const survey = await this.service.findById(id);
    survey.status = status as SurveyStatus
    await survey.save();

    return ApiResponse.Success({
      data: survey
    })
  }

  @Post("")
  async createOrUpdate(@Body() survey: SurveyDto) {
    return ApiResponse.Success({
      data: await this.service.createOrUpdate(survey)
    })
  }
}
