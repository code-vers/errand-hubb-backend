import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateReviewDto } from './dto/create-review.dto.js';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async createReview(reviewerId: string, dto: CreateReviewDto) {
    const { revieweeId, rating, comment, postId, serviceRequestId } = dto;
    const cleanPostId = postId && postId.trim().length > 0 ? postId.trim() : null;
    const cleanServiceRequestId = serviceRequestId && serviceRequestId.trim().length > 0 ? serviceRequestId.trim() : null;

    if (reviewerId === revieweeId) {
      throw new BadRequestException('You cannot write a review for yourself.');
    }

    // Verify reviewer & reviewee
    const [reviewer, reviewee] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: reviewerId } }),
      this.prisma.user.findUnique({ where: { id: revieweeId } }),
    ]);

    if (!reviewer) throw new NotFoundException('Reviewer user not found.');
    if (!reviewee) throw new NotFoundException('Reviewee user not found.');

    // Check if task exists & verify completion
    if (cleanPostId) {
      const post = await this.prisma.post.findUnique({ where: { id: cleanPostId } });
      if (!post) throw new NotFoundException('Post not found.');

      // Check duplicate review
      const existing = await this.prisma.review.findFirst({
        where: { reviewerId, revieweeId, postId: cleanPostId },
      });
      if (existing) {
        throw new BadRequestException('You have already submitted a review for this errand.');
      }
    }

    if (cleanServiceRequestId) {
      const sr = await this.prisma.serviceRequest.findUnique({ where: { id: cleanServiceRequestId } });
      if (!sr) throw new NotFoundException('Service request not found.');

      const existing = await this.prisma.review.findFirst({
        where: { reviewerId, revieweeId, serviceRequestId: cleanServiceRequestId },
      });
      if (existing) {
        throw new BadRequestException('You have already submitted a review for this service request.');
      }
    }

    // Create Review
    const review = await this.prisma.review.create({
      data: {
        reviewerId,
        revieweeId,
        reviewerRole: reviewer.role,
        rating,
        comment,
        postId: cleanPostId,
        serviceRequestId: cleanServiceRequestId,
      },
      include: {
        reviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
            role: true,
          },
        },
      },
    });

    // Increment completed jobs on reviewee profile if reviewee is an errander
    try {
      await this.prisma.profile.update({
        where: { userId: revieweeId },
        data: { jobsCompleted: { increment: 1 } },
      }).catch(() => null);
    } catch (e) {
      // Ignore if profile doesn't exist
    }

    return review;
  }

  async getUserReviews(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [reviews, total, allRatings] = await Promise.all([
      this.prisma.review.findMany({
        where: { revieweeId: userId },
        include: {
          reviewer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profileImage: true,
              role: true,
            },
          },
          post: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.review.count({ where: { revieweeId: userId } }),
      this.prisma.review.findMany({
        where: { revieweeId: userId },
        select: { rating: true },
      }),
    ]);

    const summary = this.calculateSummary(allRatings);

    return {
      data: reviews,
      summary,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getRatingSummary(userId: string) {
    const ratings = await this.prisma.review.findMany({
      where: { revieweeId: userId },
      select: { rating: true },
    });

    return this.calculateSummary(ratings);
  }

  async checkEligibility(reviewerId: string, revieweeId: string, postId?: string, serviceRequestId?: string) {
    if (!revieweeId || reviewerId === revieweeId) {
      return { eligible: false, reason: 'Invalid user or self-review' };
    }

    if (postId) {
      const existing = await this.prisma.review.findFirst({
        where: { reviewerId, revieweeId, postId },
      });
      if (existing) return { eligible: false, reason: 'Already reviewed for this post' };
    }

    if (serviceRequestId) {
      const existing = await this.prisma.review.findFirst({
        where: { reviewerId, revieweeId, serviceRequestId },
      });
      if (existing) return { eligible: false, reason: 'Already reviewed for this service request' };
    }

    return { eligible: true };
  }

  async getAllReviews(query: {
    page?: number;
    limit?: number;
    search?: string;
    rating?: number;
    role?: string;
  }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, query.limit || 10);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.rating && Number(query.rating) > 0) {
      where.rating = Number(query.rating);
    }

    if (query.role && query.role !== 'all') {
      where.reviewerRole = query.role;
    }

    if (query.search && query.search.trim().length > 0) {
      const searchStr = query.search.trim();
      where.OR = [
        { comment: { contains: searchStr, mode: 'insensitive' } },
        { reviewer: { firstName: { contains: searchStr, mode: 'insensitive' } } },
        { reviewer: { lastName: { contains: searchStr, mode: 'insensitive' } } },
        { reviewee: { firstName: { contains: searchStr, mode: 'insensitive' } } },
        { reviewee: { lastName: { contains: searchStr, mode: 'insensitive' } } },
        { post: { title: { contains: searchStr, mode: 'insensitive' } } },
      ];
    }

    const [reviews, total, allRatings] = await Promise.all([
      this.prisma.review.findMany({
        where,
        include: {
          reviewer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              profileImage: true,
              role: true,
            },
          },
          reviewee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              profileImage: true,
              role: true,
            },
          },
          post: {
            select: {
              id: true,
              title: true,
              budget: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.review.count({ where }),
      this.prisma.review.findMany({ select: { rating: true } }),
    ]);

    const totalPlatformReviews = allRatings.length;
    const totalScore = allRatings.reduce((acc, curr) => acc + curr.rating, 0);
    const platformAvgRating = totalPlatformReviews > 0 ? Number((totalScore / totalPlatformReviews).toFixed(1)) : 0;
    const fiveStarCount = allRatings.filter((r) => r.rating === 5).length;
    const oneStarCount = allRatings.filter((r) => r.rating === 1).length;

    return {
      data: reviews,
      stats: {
        totalReviews: totalPlatformReviews,
        averageRating: platformAvgRating,
        fiveStarCount,
        oneStarCount,
      },
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private calculateSummary(ratings: { rating: number }[]) {
    const totalReviews = ratings.length;
    if (totalReviews === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        breakdown: {
          5: { count: 0, percentage: 0 },
          4: { count: 0, percentage: 0 },
          3: { count: 0, percentage: 0 },
          2: { count: 0, percentage: 0 },
          1: { count: 0, percentage: 0 },
        },
      };
    }

    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let sum = 0;

    for (const r of ratings) {
      sum += r.rating;
      if (counts[r.rating as keyof typeof counts] !== undefined) {
        counts[r.rating as keyof typeof counts]++;
      }
    }

    const averageRating = Number((sum / totalReviews).toFixed(1));

    const breakdown = {
      5: { count: counts[5], percentage: Math.round((counts[5] / totalReviews) * 100) },
      4: { count: counts[4], percentage: Math.round((counts[4] / totalReviews) * 100) },
      3: { count: counts[3], percentage: Math.round((counts[3] / totalReviews) * 100) },
      2: { count: counts[2], percentage: Math.round((counts[2] / totalReviews) * 100) },
      1: { count: counts[1], percentage: Math.round((counts[1] / totalReviews) * 100) },
    };

    return {
      averageRating,
      totalReviews,
      breakdown,
    };
  }
}
