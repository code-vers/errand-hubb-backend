import { jest, describe, beforeEach, it, expect } from '@jest/globals';
import { NotificationsService } from './notifications.service.js';
import { createMockPrismaService } from '../test-utils/mock-prisma.js';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let mockPrisma: any;
  let mockGateway: any;

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    mockGateway = {
      server: {
        to: jest.fn().mockReturnValue({
          emit: jest.fn(),
        }),
      },
    };

    service = new NotificationsService(mockPrisma, mockGateway);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createNotification', () => {
    it('should create notification in database and broadcast via gateway', async () => {
      mockPrisma.notification.create.mockResolvedValueOnce({
        id: 'notif-1',
        userId: 'u-1',
        title: 'New Review',
        message: 'You received 5 stars',
      });

      const result = await service.createNotification('u-1', {
        type: 'review_received',
        title: 'New Review',
        message: 'You received 5 stars',
      });

      expect(mockPrisma.notification.create).toHaveBeenCalled();
      expect(mockGateway.server.to).toHaveBeenCalledWith('user_u-1');
      expect(result).toHaveProperty('id', 'notif-1');
    });
  });

  describe('getUserNotifications', () => {
    it('should return paginated notifications', async () => {
      mockPrisma.notification.findMany.mockResolvedValueOnce([
        { id: 'notif-1', title: 'Test', isRead: false },
      ]);
      mockPrisma.notification.count.mockResolvedValueOnce(1);

      const result = await service.getUserNotifications('u-1', 1, 20);
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('markAsRead', () => {
    it('should throw NotFoundException if notification does not exist', async () => {
      mockPrisma.notification.findUnique.mockResolvedValueOnce(null);
      await expect(service.markAsRead('notif-1', 'u-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if notification belongs to another user', async () => {
      mockPrisma.notification.findUnique.mockResolvedValueOnce({
        id: 'notif-1',
        userId: 'other-user',
      });
      await expect(service.markAsRead('notif-1', 'u-1')).rejects.toThrow(ForbiddenException);
    });

    it('should mark notification as read', async () => {
      mockPrisma.notification.findUnique.mockResolvedValueOnce({
        id: 'notif-1',
        userId: 'u-1',
        isRead: false,
      });
      mockPrisma.notification.update.mockResolvedValueOnce({
        id: 'notif-1',
        isRead: true,
      });

      const result = await service.markAsRead('notif-1', 'u-1');
      expect(mockPrisma.notification.update).toHaveBeenCalled();
      expect(result.isRead).toBe(true);
    });
  });
});
