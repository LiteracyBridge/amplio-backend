import { Module } from "@nestjs/common";
import { TalkingBookAnalyticsController } from "./tb-analytics.controller";
import { TalkingBookAnalyticsService } from "./tb-analytics.service";
import { UsageQueryService } from "./usage-query.service";
import { CustomSurveyReportService } from "./custom-survey-report.service";

@Module({
	controllers: [TalkingBookAnalyticsController],
	providers: [
		TalkingBookAnalyticsService,
		UsageQueryService,
		CustomSurveyReportService,
	],
})
export class TalkingBookAnalyticsModule {}
