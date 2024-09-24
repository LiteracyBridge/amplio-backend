import { Module } from '@nestjs/common';
import { SurveyController } from './surveys/survey.controller';
import { SurveyService } from './surveys/survey.service';
import { UfMessagesController } from './uf-messages/uf-messages.controller';

@Module({
  controllers: [SurveyController, UfMessagesController],
  providers: [SurveyService]
})
export class UserfeedbackModule {}
