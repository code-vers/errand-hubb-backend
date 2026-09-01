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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ReviewsService } from './reviews.service.js';
import { CreateReviewDto } from './dto/create-review.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiOperation({ summary: 'Submit a review & rating for an errand or service request participant' })
  @ApiResponse({ status: 201, description: 'Review submitted successfully' })
  @ApiResponse({ status: 400, description: 'Erraned not completed, self-review attempted, or duplicate review' })
  @ApiResponse({ status: 403, description: 'User was not a participant in this errand' })
  async createReview(@Request() req: any, @Body() dto: CreateReviewDto) {
    return this.reviewsService.createReview(req.user.id, dto);
  }

  @Get('all')
  @ApiOperation({ summary: 'Get all platform reviews with pagination, search, and rating filters' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Page limit' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search term for user name or comment' })
  @ApiQuery({ name: 'rating', required: false, type: Number, description: 'Filter by exact star rating (1-5)' })
  @ApiQuery({ name: 'role', required: false, type: String, description: 'Filter by reviewer role' })
  @ApiResponse({ status: 200, description: 'Paginated reviews list' })
  async getAllReviews(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('rating') rating?: string,
    @Query('role') role?: string,
  ) {
    return this.reviewsService.getAllReviews({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
      search,
      rating: rating ? parseInt(rating, 10) : undefined,
      role,
    });
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get all reviews written for a specific user' })
  @ApiParam({ name: 'userId', description: 'Target user ID' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Page limit' })
  @ApiResponse({ status: 200, description: 'User reviews and rating breakdown' })
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
  @ApiOperation({ summary: 'Get average rating and 1-5 star breakdown summary for a user' })
  @ApiParam({ name: 'userId', description: 'Target user ID' })
  @ApiResponse({ status: 200, description: 'User rating breakdown summary' })
  async getRatingSummary(@Param('userId') userId: string) {
    return this.reviewsService.getRatingSummary(userId);
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Get('check-eligibility')
  @ApiOperation({ summary: 'Check if current authenticated user is eligible to review a target user on a post/request' })
  @ApiQuery({ name: 'revieweeId', required: true, type: String, description: 'Target user ID to review' })
  @ApiQuery({ name: 'postId', required: false, type: String, description: 'Errand post ID' })
  @ApiQuery({ name: 'serviceRequestId', required: false, type: String, description: 'Service request ID' })
  @ApiResponse({ status: 200, description: 'Eligibility boolean status: { canReview: boolean, reason?: string }' })
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
