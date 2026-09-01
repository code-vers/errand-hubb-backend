import { jest, describe, beforeEach, it, expect } from '@jest/globals';
import { WebhooksController } from './webhooks.controller.js';
import { WebhooksService } from './webhooks.service.js';
import { BadRequestException } from '@nestjs/common';

describe('WebhooksController', () => {
  let controller: WebhooksController;
  let service: jest.Mocked<Partial<WebhooksService>>;

  beforeEach(() => {
    service = {
      handleStripeEvent: jest.fn<any>().mockResolvedValue({ received: true }),
    };

    controller = new WebhooksController(service as unknown as WebhooksService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('handleStripeWebhook', () => {
    it('should throw BadRequestException if stripe-signature is missing', async () => {
      await expect(controller.handleStripeWebhook('', {} as any)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if rawBody is missing', async () => {
      await expect(controller.handleStripeWebhook('sig_123', {} as any)).rejects.toThrow(BadRequestException);
    });

    it('should process verified event and return result', async () => {
      const mockEvent: any = { id: 'evt_123', type: 'checkout.session.completed' };
      (controller as any).stripe = {
        webhooks: {
          constructEvent: jest.fn<any>().mockReturnValue(mockEvent),
        },
      };

      const req = { rawBody: Buffer.from('{"id":"evt_123"}') };
      const result = await controller.handleStripeWebhook('sig_123', req);
      expect(service.handleStripeEvent).toHaveBeenCalledWith(mockEvent);
      expect(result).toEqual({ received: true });
    });
  });
});
