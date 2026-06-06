import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

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
      console.warn('SERVICE: findUnique failed for ID:', id, '- trying findFirst');
      user = await this.prisma.user.findFirst({
        where: { id },
        include: { profile: true },
      });
    }

    if (!user) {
      console.error('SERVICE: User NOT FOUND in database for ID:', id);
    } else {
      console.log('SERVICE: User found:', user.email);
    }
    
    return user;
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

  async updateFullProfile(id: string, data: { firstName?: string; lastName?: string; profileImage?: string; profile?: any }) {
    const { firstName, lastName, profileImage, profile } = data;
    
    let profileUpdateData: any = undefined;
    if (profile) {
      profileUpdateData = { ...profile };
      
      // Sanitize profile data: convert empty strings to null for optional fields
      // This prevents Prisma from failing on empty strings for Decimal/Int fields
      Object.keys(profileUpdateData).forEach(key => {
        if (profileUpdateData[key] === '') {
          profileUpdateData[key] = null;
        }
      });

      if (profileUpdateData.ratePerHour !== undefined && profileUpdateData.ratePerHour !== null) {
        try {
          profileUpdateData.ratePerHour = new Prisma.Decimal(profileUpdateData.ratePerHour);
        } catch (error) {
          console.error('SERVICE: Failed to parse ratePerHour:', profileUpdateData.ratePerHour);
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
        profile: profileUpdateData ? {
          upsert: {
            create: profileUpdateData,
            update: profileUpdateData,
          },
        } : undefined,
      },
      include: { profile: true },
    });
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
}
