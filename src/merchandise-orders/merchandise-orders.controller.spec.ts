import { Test, TestingModule } from '@nestjs/testing';
import { MerchandiseOrdersController } from './merchandise-orders.controller';

describe('MerchandiseOrdersController', () => {
  let controller: MerchandiseOrdersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MerchandiseOrdersController],
    }).compile();

    controller = module.get<MerchandiseOrdersController>(MerchandiseOrdersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
