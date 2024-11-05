import { Test, TestingModule } from '@nestjs/testing';
import { DashboardQueriesController } from './dashboard-queries.controller';

describe('DashboardQueriesController', () => {
  let controller: DashboardQueriesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardQueriesController],
    }).compile();

    controller = module.get<DashboardQueriesController>(DashboardQueriesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
