import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { MailService } from '../mail/mail.service.js';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async findOneByEmail(email: string) {
    if (!email) {
      throw new BadRequestException('Email is required');
    }
    return this.prisma.user.findUnique({
      where: { email },
      include: { profile: true },
    });
  }

  async findOneById(id: string) {
    if (!id) {
      console.error('SERVICE: findOneById called without ID');
      return null;
    }

    // Attempt standard UUID lookup
    let user = await this.prisma.user.findUnique({
      where: { id },
      include: { profile: true },
    });

    // Backup search
    if (!user) {
      console.warn(
        'SERVICE: findUnique failed for ID:',
        id,
        '- trying findFirst',
      );
      user = await this.prisma.user.findFirst({
        where: { id },
        include: { profile: true },
      });
    }

    if (!user) {
      console.error('SERVICE: User NOT FOUND in database for ID:', id);
      return null;
    } else {
      console.log('SERVICE: User found:', user.email);
    }

    // Compute real-time user account overview statistics
    const [totalPosts, activePosts, completedJobsCount, totalHiresCount] =
      await Promise.all([
        this.prisma.post.count({ where: { userId: id } }),
        this.prisma.post.count({
          where: { userId: id, status: 'active' },
        }),
        this.prisma.post.count({
          where: {
            OR: [
              { userId: id, status: 'completed' },
              { assignedToId: id, status: 'completed' },
            ],
          },
        }),
        this.prisma.post.count({
          where: {
            OR: [
              { userId: id, assignedToId: { not: null } },
              { assignedToId: id },
            ],
          },
        }),
      ]);

    const stats = {
      totalPosts,
      activePosts,
      completedJobs: Math.max(
        user.profile?.jobsCompleted || 0,
        completedJobsCount,
      ),
      totalHires: totalHiresCount,
    };

    return {
      ...user,
      stats,
    };
  }

  async findAllErrands(query: any = {}) {
    const {
      categoryId,
      location,
      search,
      minBudget,
      maxBudget,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, parseInt(query.limit || '10', 10));
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      role: 'errand',
      status: 'active',
    };

    const profileWhere: any = {};

    if (categoryId && categoryId !== 'all') {
      profileWhere.categoryIds = { has: categoryId };
    }

    if (location) {
      profileWhere.OR = [
        { city: { contains: location, mode: 'insensitive' } },
        { state: { contains: location, mode: 'insensitive' } },
      ];
    }

    if (minBudget || maxBudget) {
      profileWhere.ratePerHour = {};
      if (minBudget) profileWhere.ratePerHour.gte = new Prisma.Decimal(minBudget);
      if (maxBudget) profileWhere.ratePerHour.lte = new Prisma.Decimal(maxBudget);
    }

    if (Object.keys(profileWhere).length > 0) {
      where.profile = { is: profileWhere };
    }

    if (search) {
      const searchTerms = search.trim().split(/\s+/);
      const nameOrConditions: Prisma.UserWhereInput[] = [];
      if (searchTerms.length === 1) {
        nameOrConditions.push(
          { firstName: { contains: searchTerms[0], mode: 'insensitive' } },
          { lastName: { contains: searchTerms[0], mode: 'insensitive' } }
        );
      } else {
        nameOrConditions.push(
          {
            AND: [
              { firstName: { contains: searchTerms[0], mode: 'insensitive' } },
              { lastName: { contains: searchTerms.slice(1).join(' '), mode: 'insensitive' } },
            ],
          },
          {
            AND: [
              { lastName: { contains: searchTerms[0], mode: 'insensitive' } },
              { firstName: { contains: searchTerms.slice(1).join(' '), mode: 'insensitive' } },
            ],
          }
        );
      }
      where.OR = [
        ...(where.OR || []),
        { email: { contains: search, mode: 'insensitive' } },
        ...nameOrConditions,
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          profileImage: true,
          profile: true,
          createdAt: true,
          reviewsReceived: {
            select: {
              rating: true,
            },
          },
        },
        orderBy: {
          [sortBy === 'budget' ? 'createdAt' : sortBy]: sortOrder,
        },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    const mappedUsers = users.map((u) => {
      const reviews = u.reviewsReceived || [];
      const reviewCount = reviews.length;
      const totalScore = reviews.reduce((sum, r) => sum + r.rating, 0);
      const averageRating = reviewCount > 0 ? Number((totalScore / reviewCount).toFixed(1)) : 0;

      const { reviewsReceived, ...rest } = u;
      return {
        ...rest,
        reviewCount,
        rating: averageRating,
      };
    });

    let sortedUsers = mappedUsers;
    if (sortBy === 'budget') {
      sortedUsers.sort((a, b) => {
        const rateA = a.profile?.ratePerHour ? Number(a.profile.ratePerHour) : 0;
        const rateB = b.profile?.ratePerHour ? Number(b.profile.ratePerHour) : 0;
        return sortOrder === 'asc' ? rateA - rateB : rateB - rateA;
      });
    }

    return {
      data: sortedUsers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createUser(data: Prisma.UserCreateInput) {
    return this.prisma.user.create({
      data,
      include: { profile: true },
    });
  }

  async update(id: string, data: Prisma.UserUpdateInput) {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async updateFullProfile(
    id: string,
    data: {
      firstName?: string;
      lastName?: string;
      profileImage?: string;
      profile?: any;
    },
  ) {
    const { firstName, lastName, profileImage, profile } = data;

    let profileUpdateData: any = undefined;
    if (profile) {
      profileUpdateData = { ...profile };

      // Sanitize profile data: convert empty strings to null for optional fields
      // This prevents Prisma from failing on empty strings for Decimal/Int fields
      Object.keys(profileUpdateData).forEach((key) => {
        if (profileUpdateData[key] === '') {
          profileUpdateData[key] = null;
        }
      });

      if (
        profileUpdateData.ratePerHour !== undefined &&
        profileUpdateData.ratePerHour !== null
      ) {
        try {
          profileUpdateData.ratePerHour = new Prisma.Decimal(
            profileUpdateData.ratePerHour,
          );
        } catch (error) {
          console.error(
            'SERVICE: Failed to parse ratePerHour:',
            profileUpdateData.ratePerHour,
          );
          profileUpdateData.ratePerHour = null;
        }
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        firstName,
        lastName,
        profileImage,
        profile: profileUpdateData
          ? {
              upsert: {
                create: profileUpdateData,
                update: profileUpdateData,
              },
            }
          : undefined,
      },
      include: { profile: true },
    });
  }

  async requestDeleteAccount(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new BadRequestException('User not found');

    // Generate a 6-digit numeric code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + 15); // 15 minute expiry

    await this.prisma.user.update({
      where: { id },
      data: {
        deleteAccountToken: code,
        deleteAccountExpires: expires,
      },
    });

    await this.mailService.sendAccountDeletionEmail(user.email, code);

    return { message: 'Deletion verification code sent to your email' };
  }

  async deleteAccount(
    id: string,
    passwordAttempt: string,
    verificationCode: string,
  ) {
    console.log('DEBUG: Attempting account deletion for user ID:', id);
    console.log(
      'DEBUG: Verification code provided:',
      `[${verificationCode}]`,
      'Length:',
      verificationCode?.length,
    );
    console.log('DEBUG: Password provided length:', passwordAttempt?.length);

    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      console.error('DEBUG: User not found for deletion');
      throw new BadRequestException('User not found');
    }

    // 1. Verify Password
    console.log('DEBUG: Verifying password...');
    const isPasswordValid = await bcrypt.compare(
      passwordAttempt,
      user.password,
    );
    if (!isPasswordValid) {
      console.error('DEBUG: Password mismatch');
      throw new UnauthorizedException(
        'Incorrect password. Account deletion aborted.',
      );
    }

    // 2. Verify Email Token
    console.log(
      'DEBUG: Verifying email token. Stored:',
      `[${user.deleteAccountToken}]`,
      'Provided:',
      `[${verificationCode}]`,
    );
    if (
      !user.deleteAccountToken ||
      user.deleteAccountToken !== verificationCode
    ) {
      console.error(
        'DEBUG: Token mismatch. Equal:',
        user.deleteAccountToken === verificationCode,
      );
      throw new BadRequestException('Invalid verification code');
    }

    console.log(
      'DEBUG: Checking token expiry. Expires:',
      user.deleteAccountExpires,
      'Now:',
      new Date(),
    );
    if (!user.deleteAccountExpires || user.deleteAccountExpires < new Date()) {
      console.error('DEBUG: Token expired');
      throw new BadRequestException('Verification code has expired');
    }

    // 3. Perform the deletion
    console.log('DEBUG: All checks passed. Deleting user...');
    await this.prisma.user.delete({
      where: { id },
    });

    return { message: 'Account deleted successfully' };
  }

  async findByResetToken(token: string) {
    return this.prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: {
          gt: new Date(),
        },
      },
    });
  }

  async findByVerificationToken(token: string) {
    return this.prisma.user.findFirst({
      where: {
        verificationToken: token,
        verificationTokenExpires: {
          gt: new Date(),
        },
      },
    });
  }

  async findAllUsersForAdmin() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        profileImage: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateUserStatus(id: string, status: any) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new BadRequestException('User not found');
    }
    return this.prisma.user.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        status: true,
      }
    });
  }
}
