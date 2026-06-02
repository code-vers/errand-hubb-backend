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
      throw new BadRequestException('ID is required');
    }
    return this.prisma.user.findUnique({
      where: { id },
      include: { profile: true },
    });
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
    
    return this.prisma.user.update({
      where: { id },
      data: {
        firstName,
        lastName,
        profileImage,
        profile: profile ? {
          update: profile,
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
