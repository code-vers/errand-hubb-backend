import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateAdDto } from './dto/create-ad.dto.js';
import { UpdateAdDto } from './dto/update-ad.dto.js';
import { AdStatus, Prisma } from '@prisma/client';

@Injectable()
export class AdsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateAdDto) {
    return this.prisma.ad.create({
      data: {
        ...dto,
        userId,
        status: AdStatus.active, // Default to active for now as requested
      },
      include: {
        category: true,
        subcategory: true,
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
    subcategoryId?: string;
    search?: string;
    location?: string;
    page?: string;
    limit?: string;
    status?: AdStatus;
  }) {
    const { categoryId, subcategoryId, search, location, status = AdStatus.active } = query;
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, parseInt(query.limit || '10', 10));
    const skip = (page - 1) * limit;

    const where: Prisma.AdWhereInput = { status };

    if (categoryId) where.categoryId = categoryId;
    if (subcategoryId) where.subcategoryId = subcategoryId;
    
    if (location) {
      where.location = { contains: location, mode: 'insensitive' };
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { companyName: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { category: { name: { contains: search, mode: 'insensitive' } } },
        { subcategory: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.ad.findMany({
        where,
        include: {
          category: true,
          subcategory: true,
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
        skip,
        take: limit,
      }),
      this.prisma.ad.count({ where }),
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

  async findOne(id: string) {
    const ad = await this.prisma.ad.findUnique({
      where: { id },
      include: {
        category: true,
        subcategory: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
      },
    });

    if (!ad) throw new NotFoundException('Ad not found');
    return ad;
  }

  async findByUser(userId: string) {
    return this.prisma.ad.findMany({
      where: { userId },
      include: {
        category: true,
        subcategory: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, userId: string, dto: UpdateAdDto) {
    const ad = await this.findOne(id);

    // Only owner or admin can update
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (ad.userId !== userId && user?.role !== 'admin') {
      throw new ForbiddenException('You do not have permission to update this ad');
    }

    return this.prisma.ad.update({
      where: { id },
      data: dto,
      include: {
        category: true,
        subcategory: true,
      },
    });
  }

  async remove(id: string, userId: string) {
    const ad = await this.findOne(id);
    
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (ad.userId !== userId && user?.role !== 'admin') {
      throw new ForbiddenException('You do not have permission to delete this ad');
    }

    return this.prisma.ad.delete({ where: { id } });
  }

  async getCategories() {
    return this.prisma.adCategory.findMany({
      include: {
        subcategories: true,
      },
      orderBy: { name: 'asc' },
    });
  }
}
