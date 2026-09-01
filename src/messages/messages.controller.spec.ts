import { jest, describe, beforeEach, it, expect } from '@jest/globals';

jest.mock('../notifications/notifications.service.js', () => ({
  NotificationsService: class MockNotificationsService {},
}));

import { MessagesController } from './messages.controller.js';
import { MessagesService } from './messages.service.js';
import { BadRequestException } from '@nestjs/common';

describe('MessagesController', () => {
  let controller: MessagesController;
  let service: jest.Mocked<Partial<MessagesService>>;

  beforeEach(() => {
    service = {
      getConversations: jest.fn<any>().mockResolvedValue([]),
      getMessages: jest.fn<any>().mockResolvedValue([]),
      startConversation: jest.fn<any>().mockResolvedValue({ id: 'conv-1' }),
      getAdminConversations: jest.fn<any>().mockResolvedValue([]),
      getAdminMessages: jest.fn<any>().mockResolvedValue([]),
      getAdminSchedules: jest.fn<any>().mockResolvedValue([]),
    };

    controller = new MessagesController(service as unknown as MessagesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getConversations', () => {
    it('should return user conversations', async () => {
      const req = { user: { sub: 'u-1', role: 'client' } };
      const result = await controller.getConversations(req);
      expect(service.getConversations).toHaveBeenCalledWith('u-1', 'client');
      expect(result).toEqual([]);
    });
  });

  describe('startConversation', () => {
    it('should start conversation with participant', async () => {
      const req = { user: { sub: 'u-1' } };
      const dto = { participantId: 'u-2' };
      const result = await controller.startConversation(dto, req);
      expect(service.startConversation).toHaveBeenCalledWith('u-1', 'u-2');
      expect(result).toEqual({ id: 'conv-1' });
    });
  });

  describe('uploadFile', () => {
    it('should throw BadRequestException if no file is provided', async () => {
      await expect(controller.uploadFile(undefined as any)).rejects.toThrow(BadRequestException);
    });

    it('should return file metadata when file is provided', async () => {
      const mockFile: any = { filename: 'test.jpg', mimetype: 'image/jpeg', size: 1024 };
      const result = await controller.uploadFile(mockFile);
      expect(result).toEqual({
        url: '/media/chat/test.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
      });
    });
  });
});
