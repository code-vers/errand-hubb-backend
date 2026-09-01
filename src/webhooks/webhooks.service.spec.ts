import { jest, describe, beforeEach, it, expect } from '@jest/globals';
import { WebhooksService } from './webhooks.service.js';
import { MailService } from '../mail/mail.service.js';
import { createMockPrismaService } from '../test-utils/mock-prisma.js';

describe('WebhooksService', () => {
  let service: WebhooksService;
  let mockPrisma: any;
  let mockMailService: jest.Mocked<Partial<MailService>>;

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    mockPrisma.webhookEvent = {
      findUnique: jest.fn<any>().mockResolvedValue(null),
      create: jest.fn<any>().mockResolvedValue({ id: 'wh-1' }),
      update: jest.fn<any>().mockResolvedValue({ id: 'wh-1' }),
    };

    mockMailService = {
      sendOrderConfirmationEmail: jest.fn<any>().mockResolvedValue(true),
    };

    service = new WebhooksService(mockPrisma, mockMailService as unknown as MailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleStripeEvent', () => {
    it('should skip duplicate events', async () => {
      mockPrisma.webhookEvent.findUnique.mockResolvedValueOnce({ id: 'existing-event' });

      const result = await service.handleStripeEvent({
        id: 'evt_duplicate',
        type: 'checkout.session.completed',
      } as any);

      expect(mockPrisma.webhookEvent.create).not.toHaveBeenCalled();
      expect(result).toEqual({ received: true });
    });

    it('should process new webhook events and record them', async () => {
      mockPrisma.webhookEvent.findUnique.mockResolvedValueOnce(null);

      const result = await service.handleStripeEvent({
        id: 'evt_new',
        type: 'unknown.event',
        data: { object: {} },
      } as any);

      expect(mockPrisma.webhookEvent.create).toHaveBeenCalledWith({
        data: { stripeEventId: 'evt_new', type: 'unknown.event' },
      });
      expect(result).toEqual({ received: true });
    });
  });
});
