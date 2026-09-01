import { jest, describe, beforeEach, it, expect } from '@jest/globals';
import { PostsService } from './posts.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { createMockPrismaService } from '../test-utils/mock-prisma.js';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';

describe('PostsService', () => {
  let service: PostsService;
  let mockNotificationsService: jest.Mocked<Partial<NotificationsService>>;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    mockNotificationsService = {
      createNotification: jest.fn<any>().mockResolvedValue({ id: 'notif-1' }),
      notifyAdmins: jest.fn<any>().mockResolvedValue(true),
    };

    service = new PostsService(mockPrisma, mockNotificationsService as unknown as NotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create errand post and return post object', async () => {
      mockPrisma.post.create.mockResolvedValueOnce({
        id: 'p-1',
        title: 'Grocery Run',
        budget: 50,
      });

      const result = await service.create('u-1', {
        title: 'Grocery Run',
        description: 'Buy bread and milk',
        categoryId: 'c-1',
        city: 'Austin',
        state: 'TX',
        budget: 50,
      });

      expect(mockPrisma.post.create).toHaveBeenCalled();
      expect(result).toHaveProperty('id', 'p-1');
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if post does not exist', async () => {
      mockPrisma.post.findUnique.mockResolvedValueOnce(null);
      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should return post with calculated ratings', async () => {
      mockPrisma.post.findUnique.mockResolvedValueOnce({
        id: 'p-1',
        title: 'Grocery Run',
        user: {
          id: 'u-1',
          firstName: 'Alice',
          reviewsReceived: [{ rating: 5 }, { rating: 3 }],
        },
      });

      const result = await service.findOne('p-1');
      expect(result).toHaveProperty('id', 'p-1');
      expect(result.user.rating).toBe(4);
      expect(result.user.reviewCount).toBe(2);
    });
  });

  describe('assignPost', () => {
    it('should throw ForbiddenException if assigner is not the post owner', async () => {
      mockPrisma.post.findUnique.mockResolvedValueOnce({ id: 'p-1', userId: 'owner-id' });
      await expect(service.assignPost('p-1', 'not-owner', 'errander-id')).rejects.toThrow(ForbiddenException);
    });

    it('should assign post and dispatch notification', async () => {
      mockPrisma.post.findUnique.mockResolvedValueOnce({ id: 'p-1', userId: 'owner-id' });
      mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 'errander-id' });
      mockPrisma.post.update.mockResolvedValueOnce({ id: 'p-1', assignedToId: 'errander-id' });

      const result = await service.assignPost('p-1', 'owner-id', 'errander-id');
      expect(mockPrisma.post.update).toHaveBeenCalled();
      expect(mockNotificationsService.createNotification).toHaveBeenCalled();
      expect(result).toHaveProperty('id', 'p-1');
    });
  });

  describe('markCompleted', () => {
    it('should throw BadRequestException if no errander is assigned', async () => {
      mockPrisma.post.findUnique.mockResolvedValueOnce({ id: 'p-1', userId: 'owner-id', assignedToId: null });
      await expect(service.markCompleted('p-1', 'owner-id')).rejects.toThrow(BadRequestException);
    });

    it('should mark completed and increment errander jobsCompleted', async () => {
      mockPrisma.post.findUnique.mockResolvedValueOnce({ id: 'p-1', userId: 'owner-id', assignedToId: 'errander-id' });
      mockPrisma.post.update.mockResolvedValueOnce({ id: 'p-1', status: 'completed' });

      const result = await service.markCompleted('p-1', 'owner-id');
      expect(mockPrisma.profile.update).toHaveBeenCalledWith({
        where: { userId: 'errander-id' },
        data: { jobsCompleted: { increment: 1 } },
      });
      expect(result).toHaveProperty('status', 'completed');
    });
  });
});
