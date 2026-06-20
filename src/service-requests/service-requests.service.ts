import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateServiceRequestDto } from './dto/create-service-request.dto.js';
import { UpdateServiceRequestDto } from './dto/update-service-request.dto.js';
import { Prisma, ServiceRequestStatus } from '@prisma/client';

@Injectable()
export class ServiceRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Client Methods ───────────────────────────────────────────────

  async create(userId: string, dto: CreateServiceRequestDto) {
    const { categoryId, budget, dateNeeded, status, ...rest } = dto;

    return this.prisma.serviceRequest.create({
      data: {
        ...rest,
        state: rest.state || '',
        budget: budget ? new Prisma.Decimal(budget) : null,
        dateNeeded: dateNeeded ? new Date(dateNeeded) : null,
        status: (status as ServiceRequestStatus) || 'active',
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

  async findMyRequests(userId: string) {
    return this.prisma.serviceRequest.findMany({
      where: { userId },
      include: {
        category: true,
        _count: {
          select: { conversations: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findMyRequestById(id: string, userId: string) {
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id },
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
        conversations: {
          include: {
            errand: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profileImage: true,
              },
            },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
          orderBy: { updatedAt: 'desc' },
        },
        _count: {
          select: { conversations: true },
        },
      },
    });

    if (!request) {
      throw new NotFoundException(`Service request with ID ${id} not found`);
    }

    if (request.userId !== userId) {
      throw new ForbiddenException(
        'You can only view your own service requests',
      );
    }

    return request;
  }

  async update(id: string, userId: string, dto: UpdateServiceRequestDto) {
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException(`Service request with ID ${id} not found`);
    }

    if (request.userId !== userId) {
      throw new ForbiddenException(
        'You can only update your own service requests',
      );
    }

    const { categoryId, budget, dateNeeded, ...rest } = dto;
    const data: Prisma.ServiceRequestUpdateInput = { ...rest } as any;

    if (budget !== undefined)
      data.budget = budget ? new Prisma.Decimal(budget) : null;
    if (dateNeeded !== undefined)
      data.dateNeeded = dateNeeded ? new Date(dateNeeded) : null;
    if (categoryId) data.category = { connect: { id: categoryId } };

    return this.prisma.serviceRequest.update({
      where: { id },
      data,
      include: { category: true },
    });
  }

  async remove(id: string, userId: string) {
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException(`Service request with ID ${id} not found`);
    }

    if (request.userId !== userId) {
      throw new ForbiddenException(
        'You can only delete your own service requests',
      );
    }

    // Unlink conversations before deleting (onDelete: SetNull handles this via FK)
    return this.prisma.serviceRequest.delete({
      where: { id },
    });
  }

  async changeStatus(id: string, userId: string, status: string) {
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException(`Service request with ID ${id} not found`);
    }

    if (request.userId !== userId) {
      throw new ForbiddenException(
        'You can only change the status of your own service requests',
      );
    }

    return this.prisma.serviceRequest.update({
      where: { id },
      data: { status: status as any },
      include: { category: true },
    });
  }

  async getConversationsForRequest(id: string, userId: string) {
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException(`Service request with ID ${id} not found`);
    }

    if (request.userId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    return this.prisma.conversation.findMany({
      where: { serviceRequestId: id },
      include: {
        errand: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  // ─── Errand Provider Methods ──────────────────────────────────────

  async findAvailable(query: {
    categoryId?: string;
    city?: string;
    search?: string;
    minBudget?: string;
    maxBudget?: string;
    page?: string;
    limit?: string;
    urgencyLevel?: string;
  }) {
    const {
      categoryId,
      city,
      search,
      minBudget,
      maxBudget,
      urgencyLevel,
    } = query;

    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, parseInt(query.limit || '12', 10));
    const skip = (page - 1) * limit;

    const where: Prisma.ServiceRequestWhereInput = {
      status: 'active',
    };

    if (categoryId && categoryId !== 'all') {
      where.categoryId = categoryId;
    }

    if (city) {
      where.OR = [
        { city: { contains: city, mode: 'insensitive' } },
        { state: { contains: city, mode: 'insensitive' } },
      ];
    }

    if (search) {
      const searchConditions = [
        { title: { contains: search, mode: 'insensitive' as const } },
        { description: { contains: search, mode: 'insensitive' as const } },
      ];
      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchConditions }];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
    }

    if (minBudget || maxBudget) {
      where.budget = {};
      if (minBudget) where.budget.gte = new Prisma.Decimal(minBudget);
      if (maxBudget) where.budget.lte = new Prisma.Decimal(maxBudget);
    }

    if (urgencyLevel) {
      where.urgencyLevel = urgencyLevel;
    }

    const [data, total] = await Promise.all([
      this.prisma.serviceRequest.findMany({
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
          _count: {
            select: { conversations: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.serviceRequest.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findAvailableById(id: string) {
    const request = await this.prisma.serviceRequest.findUnique({
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
        _count: {
          select: { conversations: true },
        },
      },
    });

    if (!request) {
      throw new NotFoundException(`Service request with ID ${id} not found`);
    }

    if (request.status !== 'active' && request.status !== 'in_discussion') {
      throw new ForbiddenException('This service request is not available');
    }

    return request;
  }

  async contactClient(
    serviceRequestId: string,
    errandUserId: string,
  ) {
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id: serviceRequestId },
    });

    if (!request) {
      throw new NotFoundException('Service request not found');
    }

    if (
      request.status !== 'active' &&
      request.status !== 'in_discussion'
    ) {
      throw new ForbiddenException(
        'This service request is not available for contact',
      );
    }

    const clientId = request.userId;

    if (clientId === errandUserId) {
      throw new ForbiddenException(
        'You cannot contact yourself for your own service request',
      );
    }

    // Check for existing conversation for this specific request
    const existing = await this.prisma.conversation.findUnique({
      where: {
        clientId_errandId_serviceRequestId: {
          clientId,
          errandId: errandUserId,
          serviceRequestId,
        },
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
            role: true,
          },
        },
        errand: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
            role: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (existing) {
      return { conversation: existing, isNew: false };
    }

    // Create new conversation linked to this service request
    const conversation = await this.prisma.conversation.create({
      data: {
        clientId,
        errandId: errandUserId,
        serviceRequestId,
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
            role: true,
          },
        },
        errand: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
            role: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    // Update service request status to in_discussion if currently active
    if (request.status === 'active') {
      await this.prisma.serviceRequest.update({
        where: { id: serviceRequestId },
        data: { status: 'in_discussion' },
      });
    }

    return { conversation, isNew: true };
  }

  async checkContact(serviceRequestId: string, errandUserId: string) {
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id: serviceRequestId },
    });

    if (!request) {
      throw new NotFoundException('Service request not found');
    }

    const existing = await this.prisma.conversation.findUnique({
      where: {
        clientId_errandId_serviceRequestId: {
          clientId: request.userId,
          errandId: errandUserId,
          serviceRequestId,
        },
      },
    });

    return {
      hasContacted: !!existing,
      conversationId: existing?.id || null,
    };
  }

  // ─── Admin Methods ────────────────────────────────────────────────

  async findAllAdmin(query: {
    search?: string;
    status?: string;
    categoryId?: string;
    page?: string;
    limit?: string;
  }) {
    const { search, status, categoryId } = query;

    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, parseInt(query.limit || '10', 10));
    const skip = (page - 1) * limit;

    const where: Prisma.ServiceRequestWhereInput = {};

    if (status && status !== 'all') {
      where.status = status as any;
    }

    if (categoryId && categoryId !== 'all') {
      where.categoryId = categoryId;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        {
          user: {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.serviceRequest.findMany({
        where,
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
          _count: {
            select: { conversations: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.serviceRequest.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async adminChangeStatus(id: string, status: string) {
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException(`Service request with ID ${id} not found`);
    }

    return this.prisma.serviceRequest.update({
      where: { id },
      data: { status: status as any },
      include: {
        category: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async adminRemove(id: string) {
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException(`Service request with ID ${id} not found`);
    }

    return this.prisma.serviceRequest.delete({
      where: { id },
    });
  }
}
