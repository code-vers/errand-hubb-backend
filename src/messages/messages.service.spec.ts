import { jest, describe, beforeEach, it, expect } from '@jest/globals';

jest.mock('../notifications/notifications.service.js', () => ({
  NotificationsService: class MockNotificationsService {},
}));

import { MessagesService } from './messages.service.js';
import { createMockPrismaService } from '../test-utils/mock-prisma.js';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('MessagesService', () => {
  let service: MessagesService;
  let mockPrisma: any;
  let mockNotificationsService: any;

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    mockNotificationsService = {
      createNotification: jest.fn<any>().mockResolvedValue({ id: 'notif-1' }),
    };

    service = new MessagesService(mockPrisma, mockNotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getConversations', () => {
    it('should return mapped conversations for client', async () => {
      mockPrisma.conversation.findMany.mockResolvedValueOnce([
        {
          id: 'conv-1',
          clientId: 'u-1',
          errandId: 'u-2',
          messages: [{ id: 'm-1', text: 'Hello', createdAt: new Date() }],
          client: { id: 'u-1', firstName: 'Alice' },
          errand: { id: 'u-2', firstName: 'Bob' },
        },
      ]);

      const result = await service.getConversations('u-1', 'client');
      expect(mockPrisma.conversation.findMany).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });
  });

  describe('getMessages', () => {
    it('should throw NotFoundException if conversation does not exist', async () => {
      mockPrisma.conversation.findUnique.mockResolvedValueOnce(null);
      await expect(service.getMessages('nonexistent', 'u-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not part of conversation', async () => {
      mockPrisma.conversation.findUnique.mockResolvedValueOnce({
        id: 'conv-1',
        clientId: 'u-1',
        errandId: 'u-2',
      });

      await expect(service.getMessages('conv-1', 'u-3')).rejects.toThrow(ForbiddenException);
    });

    it('should return messages for participant and mark unread messages as read', async () => {
      mockPrisma.conversation.findUnique.mockResolvedValueOnce({
        id: 'conv-1',
        clientId: 'u-1',
        errandId: 'u-2',
      });
      mockPrisma.message.findMany.mockResolvedValueOnce([
        { id: 'm-1', text: 'Hello', senderId: 'u-2', isRead: false },
      ]);

      const result = await service.getMessages('conv-1', 'u-1');
      expect(mockPrisma.message.updateMany).toHaveBeenCalledWith({
        where: {
          conversationId: 'conv-1',
          senderId: { not: 'u-1' },
          isRead: false,
        },
        data: { isRead: true },
      });
      expect(result).toHaveLength(1);
    });
  });
});
