import { Module } from '@nestjs/common';
import { SurveyController } from './surveys/survey.controller';
import { SurveyService } from './surveys/survey.service';

@Module({
  controllers: [SurveyController],
  providers: [SurveyService]
})
export class UserfeedbackModule {}
