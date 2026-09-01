import { jest, describe, beforeEach, it, expect } from '@jest/globals';
import { ReviewsService } from './reviews.service.js';
import { createMockPrismaService } from '../test-utils/mock-prisma.js';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';

describe('ReviewsService', () => {
  let service: ReviewsService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    service = new ReviewsService(mockPrisma);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createReview', () => {
    it('should throw BadRequestException if user tries to review themselves', async () => {
      await expect(
        service.createReview('u-1', {
          revieweeId: 'u-1',
          rating: 5,
          comment: 'Self review',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if post is not completed', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ id: 'u-1', role: 'client' })
        .mockResolvedValueOnce({ id: 'u-2', role: 'errand' });

      mockPrisma.post.findUnique.mockResolvedValueOnce({
        id: 'p-1',
        status: 'open',
        userId: 'u-1',
        assignedToId: 'u-2',
      });

      await expect(
        service.createReview('u-1', {
          revieweeId: 'u-2',
          rating: 5,
          comment: 'Premature review',
          postId: 'p-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if user was not a participant in the completed errand', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ id: 'u-3', role: 'client' })
        .mockResolvedValueOnce({ id: 'u-2', role: 'errand' });

      mockPrisma.post.findUnique.mockResolvedValueOnce({
        id: 'p-1',
        status: 'completed',
        userId: 'u-1',
        assignedToId: 'u-2',
      });

      await expect(
        service.createReview('u-3', {
          revieweeId: 'u-2',
          rating: 5,
          comment: 'Random review',
          postId: 'p-1',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if user has already reviewed the completed errand', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ id: 'u-1', role: 'client' })
        .mockResolvedValueOnce({ id: 'u-2', role: 'errand' });

      mockPrisma.post.findUnique.mockResolvedValueOnce({
        id: 'p-1',
        status: 'completed',
        userId: 'u-1',
        assignedToId: 'u-2',
      });

      mockPrisma.review.findFirst.mockResolvedValueOnce({ id: 'existing-review-id' });

      await expect(
        service.createReview('u-1', {
          revieweeId: 'u-2',
          rating: 5,
          comment: 'Duplicate review',
          postId: 'p-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully create review on a completed errand', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ id: 'u-1', role: 'client' })
        .mockResolvedValueOnce({ id: 'u-2', role: 'errand' });

      mockPrisma.post.findUnique.mockResolvedValueOnce({
        id: 'p-1',
        status: 'completed',
        userId: 'u-1',
        assignedToId: 'u-2',
      });

      mockPrisma.review.findFirst.mockResolvedValueOnce(null);
      mockPrisma.review.create.mockResolvedValueOnce({
        id: 'r-1',
        reviewerId: 'u-1',
        revieweeId: 'u-2',
        rating: 5,
        comment: 'Excellent service!',
      });

      const result = await service.createReview('u-1', {
        revieweeId: 'u-2',
        rating: 5,
        comment: 'Excellent service!',
        postId: 'p-1',
      });

      expect(mockPrisma.review.create).toHaveBeenCalled();
      expect(result).toHaveProperty('id', 'r-1');
    });
  });

  describe('getRatingSummary', () => {
    it('should compute breakdown and average rating correctly', async () => {
      mockPrisma.review.findMany.mockResolvedValueOnce([
        { rating: 5 },
        { rating: 5 },
        { rating: 4 },
      ]);

      const summary = await service.getRatingSummary('u-2');
      expect(summary.totalReviews).toBe(3);
      expect(summary.averageRating).toBe(4.7);
      expect(summary.breakdown[5].count).toBe(2);
      expect(summary.breakdown[4].count).toBe(1);
    });
  });
});
