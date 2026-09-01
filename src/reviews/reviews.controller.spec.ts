import { jest, describe, beforeEach, it, expect } from '@jest/globals';
import { ReviewsController } from './reviews.controller.js';
import { ReviewsService } from './reviews.service.js';

describe('ReviewsController', () => {
  let controller: ReviewsController;
  let service: jest.Mocked<Partial<ReviewsService>>;

  beforeEach(() => {
    service = {
      createReview: jest.fn<any>().mockResolvedValue({ id: 'r-1', rating: 5, comment: 'Great!' }),
      getAllReviews: jest.fn<any>().mockResolvedValue({ data: [], meta: { total: 0 } }),
      getUserReviews: jest.fn<any>().mockResolvedValue({ data: [], summary: {}, meta: { total: 0 } }),
      getRatingSummary: jest.fn<any>().mockResolvedValue({ averageRating: 5, totalReviews: 1 }),
      checkEligibility: jest.fn<any>().mockResolvedValue({ eligible: true }),
    };

    controller = new ReviewsController(service as unknown as ReviewsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createReview', () => {
    it('should create review with authenticated user ID', async () => {
      const req = { user: { id: 'u-1' } };
      const dto: any = { revieweeId: 'u-2', rating: 5, comment: 'Great!', postId: 'p-1' };
      const result = await controller.createReview(req, dto);
      expect(service.createReview).toHaveBeenCalledWith('u-1', dto);
      expect(result).toHaveProperty('id', 'r-1');
    });
  });

  describe('getUserReviews', () => {
    it('should return paginated user reviews and summary', async () => {
      const result = await controller.getUserReviews('u-2', '1', '10');
      expect(service.getUserReviews).toHaveBeenCalledWith('u-2', 1, 10);
      expect(result).toHaveProperty('summary');
    });
  });

  describe('checkEligibility', () => {
    it('should verify eligibility', async () => {
      const req = { user: { id: 'u-1' } };
      const result = await controller.checkEligibility(req, 'u-2', 'p-1');
      expect(service.checkEligibility).toHaveBeenCalledWith('u-1', 'u-2', 'p-1', undefined);
      expect(result).toEqual({ eligible: true });
    });
  });
});
