import { jest, describe, beforeEach, it, expect } from '@jest/globals';
import { AdsSubscriptionsService } from './ads-subscriptions.service.js';
import { createMockPrismaService } from '../test-utils/mock-prisma.js';
import { NotFoundException } from '@nestjs/common';

describe('AdsSubscriptionsService', () => {
  let service: AdsSubscriptionsService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    service = new AdsSubscriptionsService(mockPrisma);

    // Mock stripe customer & session creation
    (service as any).stripe = {
      customers: {
        create: jest.fn<any>().mockResolvedValue({ id: 'cus_123' }),
      },
      checkout: {
        sessions: {
          create: jest.fn<any>().mockResolvedValue({ url: 'https://checkout.stripe.com/mock-session' }),
        },
      },
      billingPortal: {
        sessions: {
          create: jest.fn<any>().mockResolvedValue({ url: 'https://billing.stripe.com/p/session' }),
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
    it('should throw NotFoundException if user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      await expect(service.createCheckoutSession('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should create Stripe checkout session', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: 'u-1',
        email: 'test@example.com',
        firstName: 'Alice',
        lastName: 'Smith',
      });
      mockPrisma.subscription.findUnique.mockResolvedValueOnce(null);

      const result = await service.createCheckoutSession('u-1');
      expect((service as any).stripe.checkout.sessions.create).toHaveBeenCalled();
      expect(result).toHaveProperty('url', 'https://checkout.stripe.com/mock-session');
    });
  });

  describe('getMySubscription', () => {
    it('should return subscription details', async () => {
      mockPrisma.adsSubscription = {
        findUnique: jest.fn<any>().mockResolvedValue({ id: 'asub-1', userId: 'u-1', status: 'active' }),
      };

      const result = await service.getMySubscription('u-1');
      expect(result).toHaveProperty('status', 'active');
    });
  });
});
