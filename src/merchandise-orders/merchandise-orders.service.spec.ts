import { jest, describe, beforeEach, it, expect } from '@jest/globals';
import { MerchandiseOrdersService } from './merchandise-orders.service.js';
import { createMockPrismaService } from '../test-utils/mock-prisma.js';
import { NotFoundException } from '@nestjs/common';

describe('MerchandiseOrdersService', () => {
  let service: MerchandiseOrdersService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    service = new MerchandiseOrdersService(mockPrisma);

    (service as any).stripe = {
      checkout: {
        sessions: {
          create: jest.fn<any>().mockResolvedValue({ url: 'https://checkout.stripe.com/merch_pay' }),
        },
      },
    };
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create order and generate Stripe session url', async () => {
      mockPrisma.merchandiseOrder.create.mockResolvedValueOnce({
        id: 'ord-1',
        totalAmount: 30,
        status: 'pending',
      });

      const result = await service.create({
        name: 'Alice',
        email: 'alice@example.com',
        address: '123 Main St',
        city: 'Austin',
        state: 'TX',
        zipCode: '78701',
        totalAmount: 30,
        items: [{ name: 'ErrandHub T-Shirt', price: 30, quantity: 1 }],
      });

      expect(mockPrisma.merchandiseOrder.create).toHaveBeenCalled();
      expect(result).toHaveProperty('checkoutUrl', 'https://checkout.stripe.com/merch_pay');
    });
  });

  describe('updateStatus', () => {
    it('should update status of order', async () => {
      mockPrisma.merchandiseOrder.findUnique.mockResolvedValueOnce({
        id: 'ord-1',
        status: 'pending',
      });
      mockPrisma.merchandiseOrder.update.mockResolvedValueOnce({
        id: 'ord-1',
        status: 'delivered',
      });

      const result = await service.updateStatus('ord-1', 'delivered');
      expect(mockPrisma.merchandiseOrder.update).toHaveBeenCalled();
      expect(result).toHaveProperty('status', 'delivered');
    });
  });
});
