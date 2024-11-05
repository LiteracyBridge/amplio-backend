import { Module } from '@nestjs/common';
import { DashboardQueriesController } from './dashboard-queries.controller';
import { DashboardQueriesService } from './dashboard-queries.service';

@Module({
  controllers: [DashboardQueriesController],
  providers: [DashboardQueriesService]
})
export class DashboardQueriesModule {}
