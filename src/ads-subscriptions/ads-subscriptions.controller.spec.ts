import { jest, describe, beforeEach, it, expect } from '@jest/globals';
import { AdsSubscriptionsController } from './ads-subscriptions.controller.js';
import { AdsSubscriptionsService } from './ads-subscriptions.service.js';

describe('AdsSubscriptionsController', () => {
  let controller: AdsSubscriptionsController;
  let service: jest.Mocked<Partial<AdsSubscriptionsService>>;

  beforeEach(() => {
    service = {
      createCheckoutSession: jest.fn<any>().mockResolvedValue({ url: 'https://checkout.stripe.com/session-123' }),
      getMySubscription: jest.fn<any>().mockResolvedValue({ id: 'sub-1', status: 'active' }),
      cancelSubscription: jest.fn<any>().mockResolvedValue({ message: 'Cancelled' }),
      createCustomerPortal: jest.fn<any>().mockResolvedValue({ url: 'https://billing.stripe.com/p/session' }),
    };

    controller = new AdsSubscriptionsController(service as unknown as AdsSubscriptionsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createCheckoutSession', () => {
    it('should create Stripe checkout session', async () => {
      const req = { user: { sub: 'u-1' } };
      const result = await controller.createCheckoutSession(req);
      expect(service.createCheckoutSession).toHaveBeenCalledWith('u-1');
      expect(result).toHaveProperty('url');
    });
  });

  describe('getMySubscription', () => {
    it('should return active user ad subscription', async () => {
      const req = { user: { id: 'u-1' } };
      const result = await controller.getMySubscription(req);
      expect(service.getMySubscription).toHaveBeenCalledWith('u-1');
      expect(result).toHaveProperty('status', 'active');
    });
  });
});
