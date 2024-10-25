import { Test, TestingModule } from '@nestjs/testing';
import { TbLoaderService } from './tb-loader.service';

describe('TbLoaderService', () => {
  let service: TbLoaderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TbLoaderService],
    }).compile();

    service = module.get<TbLoaderService>(TbLoaderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
