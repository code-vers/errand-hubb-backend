import { jest, describe, beforeEach, it, expect } from '@jest/globals';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsService } from './notifications.service.js';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let service: jest.Mocked<Partial<NotificationsService>>;

  beforeEach(() => {
    service = {
      getUserNotifications: jest.fn<any>().mockResolvedValue({ data: [], meta: { total: 0 } }),
      getUnreadCount: jest.fn<any>().mockResolvedValue({ count: 3 }),
      markAsRead: jest.fn<any>().mockResolvedValue({ id: 'notif-1', isRead: true }),
      markAsUnread: jest.fn<any>().mockResolvedValue({ id: 'notif-1', isRead: false }),
      markAllAsRead: jest.fn<any>().mockResolvedValue({ count: 5 }),
    };

    controller = new NotificationsController(service as unknown as NotificationsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return user notifications', async () => {
      const req = { user: { sub: 'u-1' } };
      const result = await controller.findAll(req, '1', '20');
      expect(service.getUserNotifications).toHaveBeenCalledWith('u-1', 1, 20);
      expect(result).toHaveProperty('meta');
    });
  });

  describe('markAsRead', () => {
    it('should mark single notification as read', async () => {
      const req = { user: { sub: 'u-1' } };
      const result = await controller.markAsRead(req, 'notif-1');
      expect(service.markAsRead).toHaveBeenCalledWith('notif-1', 'u-1');
      expect(result).toEqual({ id: 'notif-1', isRead: true });
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      const req = { user: { sub: 'u-1' } };
      const result = await controller.markAllAsRead(req);
      expect(service.markAllAsRead).toHaveBeenCalledWith('u-1');
      expect(result).toEqual({ count: 5 });
    });
  });
});
