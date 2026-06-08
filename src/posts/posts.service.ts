import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePostDto } from './dto/create-post.dto.js';
import { UpdatePostDto } from './dto/update-post.dto.js';
import { Prisma } from '../generated/prisma/client.js';

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createPostDto: CreatePostDto) {
    const { categoryId, budget, dateNeeded, ...rest } = createPostDto;

    return this.prisma.post.create({
      data: {
        ...rest,
        budget: budget ? new Prisma.Decimal(budget) : null,
        dateNeeded: dateNeeded ? new Date(dateNeeded) : null,
        user: { connect: { id: userId } },
        category: { connect: { id: categoryId } },
      },
      include: {
        category: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profileImage: true,
          },
        },
      },
    });
  }

  async findAll(query: { categoryId?: string; city?: string; state?: string; search?: string }) {
    const { categoryId, city, state, search } = query;

    const where: Prisma.PostWhereInput = {
      status: 'active',
    };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (city) {
      where.city = { contains: city, mode: 'insensitive' };
    }

    if (state) {
      where.state = { contains: state, mode: 'insensitive' };
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.post.findMany({
      where,
      include: {
        category: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: {
        category: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
            profile: true,
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }

    return post;
  }

  async findByUser(userId: string) {
    return this.prisma.post.findMany({
      where: { userId },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, userId: string, updatePostDto: UpdatePostDto) {
    const post = await this.findOne(id);

    if (post.userId !== userId) {
      throw new ForbiddenException('You can only update your own posts');
    }

    const { categoryId, budget, dateNeeded, ...rest } = updatePostDto;

    const data: Prisma.PostUpdateInput = {
      ...rest,
    };

    if (budget) data.budget = new Prisma.Decimal(budget);
    if (dateNeeded) data.dateNeeded = new Date(dateNeeded);
    if (categoryId) data.category = { connect: { id: categoryId } };

    return this.prisma.post.update({
      where: { id },
      data,
      include: { category: true },
    });
  }

  async remove(id: string, userId: string) {
    const post = await this.findOne(id);

    if (post.userId !== userId) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    return this.prisma.post.delete({
      where: { id },
    });
  }
}
