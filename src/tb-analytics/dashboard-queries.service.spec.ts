import { Test, TestingModule } from '@nestjs/testing';
import { TalkingBookAnalyticsService } from './tb-analytics.service';

describe('TalkingBookAnalyticsService', () => {
  let service: TalkingBookAnalyticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TalkingBookAnalyticsService],
    }).compile();

    service = module.get<TalkingBookAnalyticsService>(TalkingBookAnalyticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
