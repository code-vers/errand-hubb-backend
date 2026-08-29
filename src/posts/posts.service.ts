import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePostDto } from './dto/create-post.dto.js';
import { UpdatePostDto } from './dto/update-post.dto.js';
import { Prisma } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service.js';

@Injectable()
export class PostsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async create(userId: string, createPostDto: CreatePostDto) {
    const { categoryId, budget, dateNeeded, ...rest } = createPostDto;

    const post = await this.prisma.post.create({
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

    await this.notifyActiveSubscribers(userId, post);

    return post;
  }

  private async notifyActiveSubscribers(clientUserId: string, post: any) {
    try {
      const client = await this.prisma.user.findUnique({
        where: { id: clientUserId },
      });
      const clientName = client ? `${client.firstName} ${client.lastName}`.trim() || client.email : 'A client';

      // Find active subscribed errand providers
      const subscribers = await this.prisma.user.findMany({
        where: {
          role: 'errand',
          subscription: {
            status: {
              in: ['active', 'trialing'],
            },
          },
          id: { not: clientUserId },
        },
      });

      console.log(`POSTS: Notifying ${subscribers.length} active subscribers about post ${post.id}`);

      for (const sub of subscribers) {
        // Prevent duplicate notification for the same post creation/update within a short time window if needed,
        // but since we mark the post/errand, let's check if they already have an unread notification for this post
        const existingNotif = await this.prisma.notification.findFirst({
          where: {
            userId: sub.id,
            type: 'new_errand',
            isRead: false,
            metadata: {
              path: ['postId'],
              equals: post.id,
            },
          },
        });

        if (!existingNotif) {
          await this.notificationsService.createNotification(sub.id, {
            type: 'new_errand',
            title: 'New Errand Posted',
            message: `New errand posted by ${clientName}: ${post.title}`,
            metadata: {
              postId: post.id,
              clientName,
              redirectUrl: '/dashboard/available-jobs',
            },
          });
        }
      }
    } catch (err: any) {
      console.error('POSTS: Error in notifying active subscribers:', err.message);
    }
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
    postState?: string;
    userRole?: string;
    userId?: string;
    workerName?: string;
    workerEmail?: string;
    preferredCategoryIds?: string | string[];
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
      postState,
      userRole,
      workerName,
      workerEmail,
      preferredCategoryIds,
    } = query;

    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, parseInt(query.limit || '10', 10));
    const skip = (page - 1) * limit;

    const where: Prisma.PostWhereInput = {};

    if (query.userId) {
      where.userId = query.userId;
    }

    if (status && status.toLowerCase() !== 'all') {
      if (status.toLowerCase() === 'available') {
        where.status = { notIn: ['completed', 'Completed', 'cancelled', 'Cancelled'] };
        where.postState = { notIn: ['completed', 'Completed', 'cancelled', 'Cancelled'] };
      } else {
        where.status = status;
      }
    } else if (status === undefined && !query.userId) {
      where.status = { notIn: ['completed', 'Completed', 'cancelled', 'Cancelled'] };
    }

    if (postState && postState.toLowerCase() !== 'all' && status?.toLowerCase() !== 'available') {
      where.postState = postState;
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

    const include = {
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
    };

    let parsedPreferredCategoryIds: string[] = [];
    if (preferredCategoryIds) {
      try {
        parsedPreferredCategoryIds = typeof preferredCategoryIds === 'string'
          ? JSON.parse(preferredCategoryIds)
          : preferredCategoryIds;
      } catch (e) {
        parsedPreferredCategoryIds = Array.isArray(preferredCategoryIds) ? preferredCategoryIds : [preferredCategoryIds];
      }
    }

    if (parsedPreferredCategoryIds.length > 0) {
      const matchWhere = { ...where, categoryId: { in: parsedPreferredCategoryIds } };
      const nonMatchWhere = { ...where, categoryId: { notIn: parsedPreferredCategoryIds } };

      const [matchCount, nonMatchCount] = await Promise.all([
        this.prisma.post.count({ where: matchWhere }),
        this.prisma.post.count({ where: nonMatchWhere }),
      ]);

      const total = matchCount + nonMatchCount;
      let posts: any[] = [];

      if (skip < matchCount) {
        // We need to fetch from matches
        const matches = await this.prisma.post.findMany({
          where: matchWhere,
          include,
          orderBy: { [sortBy]: sortOrder },
          skip,
          take: limit,
        });
        posts.push(...matches);

        // If we still need more, fetch from non-matches
        if (posts.length < limit && nonMatchCount > 0) {
          const remainingLimit = limit - posts.length;
          const nonMatches = await this.prisma.post.findMany({
            where: nonMatchWhere,
            include,
            orderBy: { [sortBy]: sortOrder },
            skip: 0,
            take: remainingLimit,
          });
          posts.push(...nonMatches);
        }
      } else {
        // We only fetch from non-matches
        const nonMatchSkip = skip - matchCount;
        posts = await this.prisma.post.findMany({
          where: nonMatchWhere,
          include,
          orderBy: { [sortBy]: sortOrder },
          skip: nonMatchSkip,
          take: limit,
        });
      }

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

    // Default behavior without preferred categories
    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        include,
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
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
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

  async markCompleted(id: string, userId: string, assignedToId?: string) {
    const post = await this.findOne(id);

    const targetAssignedId = post.assignedToId || assignedToId;
    if (!targetAssignedId) {
      throw new BadRequestException('Cannot mark errand as completed before an Errander is assigned.');
    }

    if (post.userId !== userId && post.assignedToId !== userId && targetAssignedId !== userId) {
      throw new ForbiddenException('Not authorized to mark this errand as completed');
    }

    const data: Prisma.PostUpdateInput = {
      status: 'completed',
      postState: 'completed',
    };

    if (!post.assignedToId && targetAssignedId) {
      data.assignedTo = { connect: { id: targetAssignedId } };
    }

    const updated = await this.prisma.post.update({
      where: { id },
      data,
      include: {
        category: true,
        user: { select: { id: true, firstName: true, lastName: true, profileImage: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true, profileImage: true } },
      },
    });

    try {
      const targetUserId = post.userId === userId ? (post.assignedToId || assignedToId) : post.userId;
      if (targetUserId) {
        await this.notificationsService.createNotification(targetUserId, {
          type: 'task_completed',
          title: 'Errand Marked as Completed',
          message: `The errand "${post.title}" was marked as completed. Click to leave a review!`,
          metadata: { postId: id, redirectUrl: '/dashboard/my-posts' },
        });
      }
    } catch (e) {
      // Ignore notification failure
    }

    return updated;
  }

  async assignPost(id: string, userId: string, assignedToId: string) {
    const post = await this.findOne(id);

    if (post.userId !== userId) {
      throw new ForbiddenException('Only the post owner can assign an errander');
    }

    const assignedUser = await this.prisma.user.findUnique({ where: { id: assignedToId } });
    if (!assignedUser) {
      throw new NotFoundException('Assigned errander user not found');
    }

    const updated = await this.prisma.post.update({
      where: { id },
      data: {
        assignedTo: { connect: { id: assignedToId } },
        status: 'In Progress',
        postState: 'assigned',
      },
      include: {
        category: true,
        user: { select: { id: true, firstName: true, lastName: true, profileImage: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true, profileImage: true } },
      },
    });

    try {
      await this.notificationsService.createNotification(assignedToId, {
        type: 'errand_assigned',
        title: 'You Were Assigned an Errand!',
        message: `You have been assigned to: "${post.title}".`,
        metadata: { postId: id, redirectUrl: '/dashboard/my-posts' },
      });
    } catch (e) {
      // Ignore notification failure
    }

    return updated;
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
