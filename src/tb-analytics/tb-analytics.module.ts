import { Module } from '@nestjs/common';
import { TalkingBookAnalyticsController } from './tb-analytics.controller';
import { TalkingBookAnalyticsService } from './tb-analytics.service';
import { UsageQueryService } from './usage-query.service';

@Module({
  controllers: [TalkingBookAnalyticsController],
  providers: [TalkingBookAnalyticsService, UsageQueryService]
})
export class TalkingBookAnalyticsModule {}
