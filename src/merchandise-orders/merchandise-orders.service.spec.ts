import { Test, TestingModule } from '@nestjs/testing';
import { MerchandiseOrdersService } from './merchandise-orders.service';

describe('MerchandiseOrdersService', () => {
  let service: MerchandiseOrdersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MerchandiseOrdersService],
    }).compile();

    service = module.get<MerchandiseOrdersService>(MerchandiseOrdersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
