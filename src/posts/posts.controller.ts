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
import { PostsService } from './posts.service.js';
import { CreatePostDto } from './dto/create-post.dto.js';
import { UpdatePostDto } from './dto/update-post.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { SubscriptionGuard } from '../auth/guards/subscription.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, SubscriptionGuard)
  create(@Request() req: any, @Body() createPostDto: CreatePostDto) {
    const userId = req.user.sub || req.user.id;
    return this.postsService.create(userId, createPostDto);
  }

  @Get()
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
      status
    });
  }

  @Get('my-posts')
  @UseGuards(JwtAuthGuard)
  findByUser(@Request() req: any) {
    const userId = req.user.sub || req.user.id;
    return this.postsService.findByUser(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.postsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, SubscriptionGuard)
  update(
    @Param('id') id: string,
    @Request() req: any,
    @Body() updatePostDto: UpdatePostDto,
  ) {
    const userId = req.user.sub || req.user.id;
    return this.postsService.update(id, userId, updatePostDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string, @Request() req: any) {
    const userId = req.user.sub || req.user.id;
    return this.postsService.remove(id, userId);
  }

  // Admin endpoints
  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
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
      sortOrder: 'desc'
    });
  }

  @Patch('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  adminUpdate(
    @Param('id') id: string,
    @Body() updatePostDto: UpdatePostDto,
  ) {
    return this.postsService.adminUpdate(id, updatePostDto);
  }

  @Delete('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  adminRemove(@Param('id') id: string) {
    return this.postsService.adminRemove(id);
  }
}
