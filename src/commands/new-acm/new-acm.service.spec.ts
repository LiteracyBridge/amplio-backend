import { Test, TestingModule } from '@nestjs/testing';
import { NewAcmService } from './new-acm.service';

describe('NewAcmService', () => {
  let service: NewAcmService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NewAcmService],
    }).compile();

    service = module.get<NewAcmService>(NewAcmService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
