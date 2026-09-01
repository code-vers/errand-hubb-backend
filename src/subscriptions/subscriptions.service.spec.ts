import { jest, describe, beforeEach, it, expect } from '@jest/globals';
import { SubscriptionsService } from './subscriptions.service.js';
import { createMockPrismaService } from '../test-utils/mock-prisma.js';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    service = new SubscriptionsService(mockPrisma);

    (service as any).stripe = {
      customers: {
        create: jest.fn<any>().mockResolvedValue({ id: 'cus_sub_123' }),
      },
      checkout: {
        sessions: {
          create: jest.fn<any>().mockResolvedValue({ url: 'https://checkout.stripe.com/sub_session' }),
        },
      },
      billingPortal: {
        sessions: {
          create: jest.fn<any>().mockResolvedValue({ url: 'https://billing.stripe.com/portal' }),
        },
      },
      subscriptions: {
        cancel: jest.fn<any>().mockResolvedValue({ status: 'canceled' }),
      },
    };
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createCheckoutSession', () => {
    it('should throw NotFoundException if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      await expect(service.createCheckoutSession('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if user is not an errand role', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: 'u-1',
        role: 'client',
      });
      await expect(service.createCheckoutSession('u-1')).rejects.toThrow(BadRequestException);
    });

    it('should create Stripe checkout session for errand user', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: 'u-1',
        email: 'errander@example.com',
        firstName: 'Bob',
        lastName: 'Builder',
        role: 'errand',
      });

      const result = await service.createCheckoutSession('u-1', 'monthly');
      expect((service as any).stripe.checkout.sessions.create).toHaveBeenCalled();
      expect(result).toHaveProperty('url', 'https://checkout.stripe.com/sub_session');
    });
  });

  describe('getMySubscription', () => {
    it('should return subscription details', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValueOnce({
        id: 'sub-1',
        userId: 'u-1',
        status: 'active',
      });

      const result = await service.getMySubscription('u-1');
      expect(result).toHaveProperty('status', 'active');
    });
  });
});
