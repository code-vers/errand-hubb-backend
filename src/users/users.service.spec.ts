import { jest, describe, beforeEach, it, expect } from '@jest/globals';
import { UsersService } from './users.service.js';
import { MailService } from '../mail/mail.service.js';
import { createMockPrismaService } from '../test-utils/mock-prisma.js';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('UsersService', () => {
  let service: UsersService;
  let mockMailService: jest.Mocked<Partial<MailService>>;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    mockMailService = {
      sendAccountDeletionEmail: jest.fn<any>().mockResolvedValue(true),
    };

    service = new UsersService(mockPrisma, mockMailService as unknown as MailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOneByEmail', () => {
    it('should throw BadRequestException if email is missing', async () => {
      await expect(service.findOneByEmail('')).rejects.toThrow(BadRequestException);
    });

    it('should return user when found', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 'u-1', email: 'test@example.com' });
      const result = await service.findOneByEmail('test@example.com');
      expect(result).toHaveProperty('id', 'u-1');
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        include: { profile: true },
      });
    });
  });

  describe('findOneById', () => {
    it('should return null if no ID provided', async () => {
      const result = await service.findOneById('');
      expect(result).toBeNull();
    });

    it('should calculate stats and return user with aggregate rating', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: 'u-1',
        email: 'test@example.com',
        profile: { jobsCompleted: 3 },
      });
      mockPrisma.post.count
        .mockResolvedValueOnce(5) // totalPosts
        .mockResolvedValueOnce(2) // activePosts
        .mockResolvedValueOnce(4) // completedJobsCount
        .mockResolvedValueOnce(4); // totalHiresCount
      mockPrisma.review.findMany.mockResolvedValueOnce([{ rating: 5 }, { rating: 4 }]);

      const result = await service.findOneById('u-1');
      expect(result).toBeDefined();
      expect(result?.stats?.totalPosts).toBe(5);
      expect(result?.stats?.activePosts).toBe(2);
      expect(result?.stats?.rating).toBe(4.5);
      expect(result?.stats?.reviewCount).toBe(2);
    });
  });

  describe('findAllErrands', () => {
    it('should return mapped errands with rating and reviewCount', async () => {
      mockPrisma.user.findMany.mockResolvedValueOnce([
        {
          id: 'e-1',
          firstName: 'Bob',
          lastName: 'Builder',
          profile: { jobsCompleted: 10 },
          reviewsReceived: [{ rating: 5 }, { rating: 5 }],
        },
      ]);
      mockPrisma.user.count.mockResolvedValueOnce(1);

      const result = await service.findAllErrands({ page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].rating).toBe(5);
      expect(result.data[0].reviewCount).toBe(2);
    });
  });
});
