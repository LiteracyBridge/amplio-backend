import { Module } from '@nestjs/common';
import { TalkingBookAnalyticsController } from './tb-analytics.controller';
import { TalkingBookAnalyticsService } from './tb-analytics.service';

@Module({
  controllers: [TalkingBookAnalyticsController],
  providers: [TalkingBookAnalyticsService]
})
export class TalkingBookAnalyticsModule {}
