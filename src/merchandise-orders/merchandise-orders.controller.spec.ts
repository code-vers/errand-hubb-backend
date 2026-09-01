import { jest, describe, beforeEach, it, expect } from '@jest/globals';
import { MerchandiseOrdersController } from './merchandise-orders.controller.js';
import { MerchandiseOrdersService } from './merchandise-orders.service.js';
import { BadRequestException } from '@nestjs/common';

describe('MerchandiseOrdersController', () => {
  let controller: MerchandiseOrdersController;
  let service: jest.Mocked<Partial<MerchandiseOrdersService>>;

  beforeEach(() => {
    service = {
      create: jest.fn<any>().mockResolvedValue({ id: 'ord-1', checkoutUrl: 'https://checkout.stripe.com/pay' }),
      findAll: jest.fn<any>().mockResolvedValue([]),
      updateStatus: jest.fn<any>().mockResolvedValue({ id: 'ord-1', status: 'shipped' }),
    };

    controller = new MerchandiseOrdersController(service as unknown as MerchandiseOrdersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create merchandise order', async () => {
      const dto = { name: 'Alice', email: 'alice@example.com', totalAmount: 25, items: [] };
      const result = await controller.create(dto);
      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toHaveProperty('id', 'ord-1');
    });
  });

  describe('updateStatus', () => {
    it('should throw BadRequestException for invalid status', () => {
      expect(() => controller.updateStatus('ord-1', 'invalid-status')).toThrow(BadRequestException);
    });

    it('should update order status for valid status', async () => {
      const result = await controller.updateStatus('ord-1', 'shipped');
      expect(service.updateStatus).toHaveBeenCalledWith('ord-1', 'shipped');
      expect(result).toEqual({ id: 'ord-1', status: 'shipped' });
    });
  });
});
