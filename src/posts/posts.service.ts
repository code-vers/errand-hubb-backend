import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePostDto } from './dto/create-post.dto.js';
import { UpdatePostDto } from './dto/update-post.dto.js';
import { Prisma } from '@prisma/client';

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createPostDto: CreatePostDto) {
    const { categoryId, budget, dateNeeded, ...rest } = createPostDto;

    // Check if user already has an active post to prevent duplicates
    const existingPost = await this.prisma.post.findFirst({
      where: { userId, status: 'active' },
    });

    if (existingPost) {
      return this.update(existingPost.id, userId, {
        ...rest,
        categoryId,
        budget,
        dateNeeded,
      } as any);
    }

    return this.prisma.post.create({
      data: {
        ...rest,
        state: rest.state || '',
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

  async findAll(query: {
    categoryId?: string;
    location?: string;
    search?: string;
    minBudget?: string;
    maxBudget?: string;
    page?: string;
    limit?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    status?: string;
    userRole?: string;
    workerName?: string;
    workerEmail?: string;
  }) {
    const {
      categoryId,
      location,
      search,
      minBudget,
      maxBudget,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      status,
      userRole,
      workerName,
      workerEmail,
    } = query;

    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, parseInt(query.limit || '10', 10));
    const skip = (page - 1) * limit;

    const where: Prisma.PostWhereInput = {};

    if (userRole) {
      where.user = { role: userRole as any };
    }

    if (status && status.toLowerCase() !== 'all') {
      where.status = status;
    } else if (status === undefined) {
      if (userRole === 'client') {
        where.status = { in: ['Pending Pickup', 'ASAP', 'Scheduled'] };
      } else {
        where.status = 'active';
      }
    }

    if (categoryId && categoryId !== 'all') {
      where.categoryId = categoryId;
    }

    if (location) {
      where.OR = [
        ...(where.OR || []),
        { city: { contains: location, mode: 'insensitive' } },
        { state: { contains: location, mode: 'insensitive' } },
      ];
    }

    if (search) {
      const searchTerms = search.trim().split(/\s+/);
      const nameOrConditions: Prisma.PostWhereInput[] = [];
      if (searchTerms.length === 1) {
        nameOrConditions.push(
          { user: { firstName: { contains: searchTerms[0], mode: 'insensitive' } } },
          { user: { lastName: { contains: searchTerms[0], mode: 'insensitive' } } }
        );
      } else {
        nameOrConditions.push(
          {
            user: {
              AND: [
                { firstName: { contains: searchTerms[0], mode: 'insensitive' } },
                { lastName: { contains: searchTerms.slice(1).join(' '), mode: 'insensitive' } }
              ]
            }
          },
          {
            user: {
              AND: [
                { lastName: { contains: searchTerms[0], mode: 'insensitive' } },
                { firstName: { contains: searchTerms.slice(1).join(' '), mode: 'insensitive' } }
              ]
            }
          }
        );
      }

      where.OR = [
        ...(where.OR || []),
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { state: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        ...nameOrConditions,
      ];
    }

    // Worker name search: matches firstName or lastName (case-insensitive, partial)
    if (workerName) {
      const nameTerms = workerName.trim().split(/\s+/);
      if (nameTerms.length === 1) {
        // Single term: match either firstName OR lastName
        where.AND = [
          ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
          {
            OR: [
              { user: { firstName: { contains: nameTerms[0], mode: 'insensitive' } } },
              { user: { lastName: { contains: nameTerms[0], mode: 'insensitive' } } },
            ],
          },
        ];
      } else {
        // Multiple terms: match first term against firstName AND second against lastName, or vice versa
        where.AND = [
          ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
          {
            OR: [
              {
                AND: [
                  { user: { firstName: { contains: nameTerms[0], mode: 'insensitive' } } },
                  { user: { lastName: { contains: nameTerms.slice(1).join(' '), mode: 'insensitive' } } },
                ],
              },
              {
                AND: [
                  { user: { lastName: { contains: nameTerms[0], mode: 'insensitive' } } },
                  { user: { firstName: { contains: nameTerms.slice(1).join(' '), mode: 'insensitive' } } },
                ],
              },
            ],
          },
        ];
      }
    }

    // Worker email search: case-insensitive partial match
    if (workerEmail) {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        { user: { email: { contains: workerEmail, mode: 'insensitive' } } },
      ];
    }

    if (minBudget || maxBudget) {
      where.budget = {};
      if (minBudget) where.budget.gte = new Prisma.Decimal(minBudget);
      if (maxBudget) where.budget.lte = new Prisma.Decimal(maxBudget);
    }

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
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
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.post.count({ where }),
    ]);

    return {
      data: posts,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
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
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
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
      include: {
        category: true,
        assignedTo: {
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

  async update(id: string, userId: string, updatePostDto: UpdatePostDto) {
    const post = await this.findOne(id);

    if (post.userId !== userId) {
      throw new ForbiddenException('You can only update your own posts');
    }

    const { categoryId, budget, dateNeeded, ...rest } = updatePostDto;

    const data: Prisma.PostUpdateInput = {
      ...rest,
    } as any;

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

  async adminUpdate(id: string, updatePostDto: UpdatePostDto) {
    const { categoryId, budget, dateNeeded, ...rest } = updatePostDto;

    const data: Prisma.PostUpdateInput = {
      ...rest,
    } as any;

    if (budget) data.budget = new Prisma.Decimal(budget);
    if (dateNeeded) data.dateNeeded = new Date(dateNeeded);
    if (categoryId) data.category = { connect: { id: categoryId } };

    return this.prisma.post.update({
      where: { id },
      data,
      include: {
        category: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async adminRemove(id: string) {
    return this.prisma.post.delete({
      where: { id },
    });
  }
}
