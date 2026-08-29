import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service.js';
import { CreateReviewDto } from './dto/create-review.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async createReview(@Request() req: any, @Body() dto: CreateReviewDto) {
    return this.reviewsService.createReview(req.user.id, dto);
  }

  @Get('user/:userId')
  async getUserReviews(
    @Param('userId') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reviewsService.getUserReviews(
      userId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  @Get('summary/:userId')
  async getRatingSummary(@Param('userId') userId: string) {
    return this.reviewsService.getRatingSummary(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('check-eligibility')
  async checkEligibility(
    @Request() req: any,
    @Query('revieweeId') revieweeId: string,
    @Query('postId') postId?: string,
    @Query('serviceRequestId') serviceRequestId?: string,
  ) {
    return this.reviewsService.checkEligibility(
      req.user.id,
      revieweeId,
      postId,
      serviceRequestId,
    );
  }
}
