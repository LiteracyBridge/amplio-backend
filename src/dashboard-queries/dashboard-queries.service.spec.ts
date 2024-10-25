import { Test, TestingModule } from '@nestjs/testing';
import { DashboardQueriesService } from './dashboard-queries.service';

describe('DashboardQueriesService', () => {
  let service: DashboardQueriesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DashboardQueriesService],
    }).compile();

    service = module.get<DashboardQueriesService>(DashboardQueriesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
