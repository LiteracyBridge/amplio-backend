import { Test, TestingModule } from '@nestjs/testing';
import { AcmCheckoutService } from './companion.service';

describe('AcmCheckoutService', () => {
  let service: AcmCheckoutService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AcmCheckoutService],
    }).compile();

    service = module.get<AcmCheckoutService>(AcmCheckoutService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
