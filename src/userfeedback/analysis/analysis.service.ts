import { Injectable, NotFoundException } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEmail, IsISO31661Alpha2, IsISO8601, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Analysis } from 'src/entities/analysis.entity';
import { AnalysisChoice } from 'src/entities/analysis_choice.entity';
import { Survey } from 'src/entities/survey.entity';
import { UserFeedbackMessage } from 'src/entities/uf_message.entity';

@Injectable()
export class AnalysisService {

  async getAll(surveyId: number) {
    return await Analysis.find({
      where: { question: { survey_id: surveyId } }
    })
  }

  private async _save_choices(analysis: Analysis, choices: number[]) {
    // # Save choices
    for (const id of choices) {
      if (id == null) continue;

      const analysis_choice = (await AnalysisChoice.findOne({ where: { id: id } })) ?? new AnalysisChoice()
      analysis_choice.analysis_id = analysis.id
      analysis_choice.choice_id = id
      await analysis_choice.save()
    }
  }

  async createOrUpdate(survey_id: number, dto: AnalysisDto) {
    const survey = await Survey.findOne({ where: { id: survey_id } })

    if (survey == null) {
      throw new NotFoundException('Survey not found')
    }

    // Update uf_message
    const message = await UserFeedbackMessage.findOne({ where: { message_uuid: dto.message_uuid } })
    if (message == null) {
      throw new NotFoundException("Message not found")
    }

    message.transcription = dto.transcription
    message.is_useless = dto.is_useless
    await message.save()


    if (dto.is_useless) {
      return this.getAll(survey_id)
    }

    try {
      // Save responses
      for (const item of dto.questions) {
        if (item == null) continue

        const analysis = (await Analysis.findOne({ where: { id: item.id } })) ?? new Analysis()

        analysis.message_uuid = dto.message_uuid
        analysis.question_id = item.question_id
        analysis.analyst_email = dto.analyst_email
        analysis.start_time = new Date(dto.start_time)
        analysis.created_at = new Date()
        analysis.updated_at = new Date()
        analysis.submit_time = new Date(dto.submit_time)
        analysis.response = item.response
        await analysis.save()

        // # Save choices
        const single_choice = item.single_choice
        if (single_choice != null) {
          await this._save_choices(analysis, [single_choice.value, single_choice.sub_choice])
        }

        await this._save_choices(analysis, item.choices ?? [])
      }
    } catch (err) {
      console.log(err)
    }

    return this.getAll(survey_id)
  }
}

export class AnalysisDto {
  @IsNotEmpty()
  @IsArray()
  questions: Record<string, any>[] = []

  @IsNotEmpty()
  @IsString()
  message_uuid: string

  @IsOptional()
  @IsEmail()
  analyst_email: string

  @IsNotEmpty()
  @IsISO8601()
  submit_time: string

  @IsNotEmpty()
  @IsISO8601()
  start_time: string

  @IsOptional()
  @IsString()
  transcription?: string;

  @IsOptional()
  @IsBoolean()
  is_useless: boolean

  /*
  * Relevant only if the analysis is useless responses
  */
  @IsOptional()
  @IsNumber()
  id?: number
}
