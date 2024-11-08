import { Test, TestingModule } from '@nestjs/testing';
import { TalkingBookAnalyticsController } from './tb-analytics.controller';

describe('DashboardQueriesController', () => {
  let controller: TalkingBookAnalyticsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TalkingBookAnalyticsController],
    }).compile();

    controller = module.get<TalkingBookAnalyticsController>(TalkingBookAnalyticsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
