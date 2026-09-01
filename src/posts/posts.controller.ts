import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { PostsService } from './posts.service.js';
import { CreatePostDto } from './dto/create-post.dto.js';
import { UpdatePostDto } from './dto/update-post.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { SubscriptionGuard } from '../auth/guards/subscription.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';

@ApiTags('Posts')
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @ApiBearerAuth('JWT-auth')
  @Post()
  @UseGuards(JwtAuthGuard, SubscriptionGuard)
  @ApiOperation({ summary: 'Create a new errand post (Client role with active plan/limits)' })
  @ApiResponse({ status: 201, description: 'Post created successfully' })
  @ApiResponse({ status: 403, description: 'Posting limit exceeded or inactive subscription' })
  create(@Request() req: any, @Body() createPostDto: CreatePostDto) {
    const userId = req.user.sub || req.user.id;
    return this.postsService.create(userId, createPostDto);
  }

  @Get()
  @ApiOperation({ summary: 'List and filter all published errand posts' })
  @ApiQuery({ name: 'categoryId', required: false, type: String, description: 'Filter by category ID' })
  @ApiQuery({ name: 'location', required: false, type: String, description: 'Filter by location keyword' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search title and description' })
  @ApiQuery({ name: 'minBudget', required: false, type: String, description: 'Minimum budget filter' })
  @ApiQuery({ name: 'maxBudget', required: false, type: String, description: 'Maximum budget filter' })
  @ApiQuery({ name: 'page', required: false, type: String, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: String, description: 'Page size limit' })
  @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Sort field' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], description: 'Sort direction' })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Status filter (e.g. open, in_progress, completed)' })
  @ApiQuery({ name: 'postState', required: false, type: String, description: 'Post state filter' })
  @ApiQuery({ name: 'userRole', required: false, type: String, description: 'Filter posts by poster role' })
  @ApiQuery({ name: 'userId', required: false, type: String, description: 'Filter posts by poster user ID' })
  @ApiQuery({ name: 'workerName', required: false, type: String, description: 'Filter posts by assigned worker name' })
  @ApiQuery({ name: 'workerEmail', required: false, type: String, description: 'Filter posts by assigned worker email' })
  @ApiQuery({ name: 'preferredCategoryIds', required: false, type: [String], description: 'Filter by preferred categories' })
  @ApiResponse({ status: 200, description: 'Paginated list of posts' })
  findAll(
    @Query('categoryId') categoryId?: string,
    @Query('location') location?: string,
    @Query('search') search?: string,
    @Query('minBudget') minBudget?: string,
    @Query('maxBudget') maxBudget?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('status') status?: string,
    @Query('postState') postState?: string,
    @Query('userRole') userRole?: string,
    @Query('userId') userId?: string,
    @Query('workerName') workerName?: string,
    @Query('workerEmail') workerEmail?: string,
    @Query('preferredCategoryIds') preferredCategoryIds?: string | string[],
  ) {
    return this.postsService.findAll({
      categoryId,
      location,
      search,
      minBudget,
      maxBudget,
      page,
      limit,
      sortBy,
      sortOrder,
      status,
      postState,
      userRole,
      userId,
      workerName,
      workerEmail,
      preferredCategoryIds,
    });
  }

  @ApiBearerAuth('JWT-auth')
  @Get('my-posts')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all posts created by or assigned to current authenticated user' })
  @ApiResponse({ status: 200, description: 'User posts' })
  findByUser(@Request() req: any) {
    const userId = req.user.sub || req.user.id;
    return this.postsService.findByUser(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single post details by ID' })
  @ApiParam({ name: 'id', description: 'Post UUID' })
  @ApiResponse({ status: 200, description: 'Post details' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  findOne(@Param('id') id: string) {
    return this.postsService.findOne(id);
  }

  @ApiBearerAuth('JWT-auth')
  @Patch(':id')
  @UseGuards(JwtAuthGuard, SubscriptionGuard)
  @ApiOperation({ summary: 'Update post details (Creator only)' })
  @ApiParam({ name: 'id', description: 'Post UUID' })
  @ApiResponse({ status: 200, description: 'Updated post' })
  update(
    @Param('id') id: string,
    @Request() req: any,
    @Body() updatePostDto: UpdatePostDto,
  ) {
    const userId = req.user.sub || req.user.id;
    return this.postsService.update(id, userId, updatePostDto);
  }

  @ApiBearerAuth('JWT-auth')
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete post (Creator only)' })
  @ApiParam({ name: 'id', description: 'Post UUID' })
  @ApiResponse({ status: 200, description: 'Post deleted successfully' })
  remove(@Param('id') id: string, @Request() req: any) {
    const userId = req.user.sub || req.user.id;
    return this.postsService.remove(id, userId);
  }

  @ApiBearerAuth('JWT-auth')
  @Patch(':id/complete')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Mark errand post as completed' })
  @ApiParam({ name: 'id', description: 'Post UUID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        assignedToId: { type: 'string', description: 'Errander ID assigned to this post' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Post marked completed' })
  markCompleted(
    @Param('id') id: string,
    @Request() req: any,
    @Body('assignedToId') assignedToId?: string,
  ) {
    const userId = req.user.sub || req.user.id;
    return this.postsService.markCompleted(id, userId, assignedToId);
  }

  @ApiBearerAuth('JWT-auth')
  @Patch(':id/assign')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Assign an errander to the post' })
  @ApiParam({ name: 'id', description: 'Post UUID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['assignedToId'],
      properties: {
        assignedToId: { type: 'string', example: 'errander-uuid' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Errander assigned to post' })
  assignPost(
    @Param('id') id: string,
    @Request() req: any,
    @Body('assignedToId') assignedToId: string,
  ) {
    const userId = req.user.sub || req.user.id;
    return this.postsService.assignPost(id, userId, assignedToId);
  }

  // Admin endpoints
  @ApiBearerAuth('JWT-auth')
  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '[Admin] Get list of all posts with filters' })
  @ApiResponse({ status: 200, description: 'Admin posts listing' })
  findAllAdmin(
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.postsService.findAll({
      categoryId,
      search,
      status,
      page,
      limit,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  }

  @ApiBearerAuth('JWT-auth')
  @Patch('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '[Admin] Update any post' })
  @ApiParam({ name: 'id', description: 'Post UUID' })
  @ApiResponse({ status: 200, description: 'Updated post' })
  adminUpdate(@Param('id') id: string, @Body() updatePostDto: UpdatePostDto) {
    return this.postsService.adminUpdate(id, updatePostDto);
  }

  @ApiBearerAuth('JWT-auth')
  @Delete('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '[Admin] Delete any post' })
  @ApiParam({ name: 'id', description: 'Post UUID' })
  @ApiResponse({ status: 200, description: 'Post removed' })
  adminRemove(@Param('id') id: string) {
    return this.postsService.adminRemove(id);
  }
}
