import { Injectable, NotFoundException } from '@nestjs/common';
import { Survey, SurveySection, SurveyStatus } from 'src/entities/survey.entity';
import { SurveyDto } from './survey.dto';

@Injectable()
export class SurveyService {
  async createOrUpdate(dto: SurveyDto): Promise<Survey> {
    const survey = dto.id != null ? (await this.findById(dto.id)) : new Survey();
    const isNew = dto.id != null;

    survey.name ??= dto.name;
    survey.project_code ??= dto.project_code;
    survey.description ??= dto.description;
    survey.status ??= dto.status ?? SurveyStatus.draft;
    await survey.save()

    // Create default section
    if (!isNew) {
      const section = new SurveySection();
      section.name = 'Untitled Section';
      section.survey_id = survey.id;
      await section.save();
    }

    return this.findById(survey.id);
  }

  async findById(id: number) {
    const survey = await Survey.findOne({
      where: { id },
      relations: { deployment: true, sections: true, questions: { choices: { sub_options: true } } }
    })

    if (survey == null) {
      throw new NotFoundException('Survey not found');
    }

    return survey;
  }
}
