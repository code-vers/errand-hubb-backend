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
        status: dto.status || AdStatus.active,
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
    includeAll?: string;
  }) {
    const { categoryId, subcategoryId, search, location, includeAll } = query;
    const status = query.status || (includeAll === 'true' ? undefined : AdStatus.active);
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, parseInt(query.limit || '10', 10));
    const skip = (page - 1) * limit;

    const where: Prisma.AdWhereInput = {};
    if (status) where.status = status;

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

    try {
      // Fetch all matching ads for sorting by position
      const [allMatchingAds, total] = await Promise.all([
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
                email: true,
                profileImage: true,
              },
            },
          },
        }),
        this.prisma.ad.count({ where }),
      ]);

      // Sort by position > 0 ascending, then createdAt descending
      const sortedAds = allMatchingAds.sort((a, b) => {
        const posA = a.position && a.position > 0 ? a.position : 99999;
        const posB = b.position && b.position > 0 ? b.position : 99999;
        if (posA !== posB) return posA - posB;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      const paginatedData = sortedAds.slice(skip, skip + limit);

      return {
        data: paginatedData,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (err: any) {
      console.warn('findAll Ads query fallback due to schema state:', err?.message);
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
                email: true,
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
            email: true,
            profileImage: true,
          },
        },
      },
    });

    if (!ad) throw new NotFoundException('Ad not found');
    return ad;
  }

  async findByUser(userId: string) {
    const ads = await this.prisma.ad.findMany({
      where: { userId },
      include: {
        category: true,
        subcategory: true,
      },
    });

    return ads.sort((a, b) => {
      const posA = a.position && a.position > 0 ? a.position : Infinity;
      const posB = b.position && b.position > 0 ? b.position : Infinity;
      if (posA !== posB) return posA - posB;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
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

  async reorderAds(adOrders: { id: string; position: number }[]) {
    const updates = adOrders.map((item) =>
      this.prisma.ad.update({
        where: { id: item.id },
        data: { position: item.position },
      })
    );
    await Promise.all(updates);
    return { success: true, message: 'Ad positions updated successfully' };
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
