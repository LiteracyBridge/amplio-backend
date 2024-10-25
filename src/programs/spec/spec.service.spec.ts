import { Test, TestingModule } from '@nestjs/testing';
import { ProgramSpecService } from './spec.service';

describe('SpecService', () => {
  let service: ProgramSpecService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProgramSpecService],
    }).compile();

    service = module.get<ProgramSpecService>(ProgramSpecService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
