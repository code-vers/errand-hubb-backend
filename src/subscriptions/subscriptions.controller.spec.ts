import { jest, describe, beforeEach, it, expect } from '@jest/globals';
import { SubscriptionsController } from './subscriptions.controller.js';
import { SubscriptionsService } from './subscriptions.service.js';

describe('SubscriptionsController', () => {
  let controller: SubscriptionsController;
  let service: jest.Mocked<Partial<SubscriptionsService>>;

  beforeEach(() => {
    service = {
      createCheckoutSession: jest.fn<any>().mockResolvedValue({ url: 'https://checkout.stripe.com/sub-session' }),
      getMySubscription: jest.fn<any>().mockResolvedValue({ id: 'sub-1', status: 'active' }),
      cancelSubscription: jest.fn<any>().mockResolvedValue({ message: 'Cancelled' }),
      createCustomerPortal: jest.fn<any>().mockResolvedValue({ url: 'https://billing.stripe.com/portal' }),
      getAllSubscriptions: jest.fn<any>().mockResolvedValue({ subscriptions: [], total: 0 }),
    };

    controller = new SubscriptionsController(service as unknown as SubscriptionsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createCheckoutSession', () => {
    it('should create membership checkout session', async () => {
      const req = { user: { id: 'u-1' } };
      const result = await controller.createCheckoutSession(req, { plan: 'monthly' });
      expect(service.createCheckoutSession).toHaveBeenCalledWith('u-1', 'monthly');
      expect(result).toHaveProperty('url');
    });
  });

  describe('getMySubscription', () => {
    it('should return subscription details', async () => {
      const req = { user: { id: 'u-1' } };
      const result = await controller.getMySubscription(req);
      expect(service.getMySubscription).toHaveBeenCalledWith('u-1');
      expect(result).toHaveProperty('status', 'active');
    });
  });
});
