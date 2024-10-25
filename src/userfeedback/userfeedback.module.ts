import { Module } from '@nestjs/common';
import { SurveyController } from './surveys/survey.controller';
import { SurveyService } from './surveys/survey.service';
import { UfMessagesController } from './uf-messages/uf-messages.controller';
import { AnalysisController } from './analysis/analysis.controller';
import { AnalysisService } from './analysis/analysis.service';

@Module({
  controllers: [SurveyController, UfMessagesController, AnalysisController],
  providers: [SurveyService, AnalysisService]
})
export class UserfeedbackModule {}
