import { Test, TestingModule } from '@nestjs/testing';
import { UfMessagesController } from './uf-messages.controller';

describe('UfMessagesController', () => {
  let controller: UfMessagesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UfMessagesController],
    }).compile();

    controller = module.get<UfMessagesController>(UfMessagesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
