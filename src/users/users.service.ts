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
    } else {
      console.log('SERVICE: User found:', user.email);
    }

    return user;
  }

  async findAllErrands() {
    return this.prisma.user.findMany({
      where: {
        role: 'errand',
        status: {
          in: ['active', 'pending'],
        },
        subscription: {
          status: {
            in: ['active', 'trialing'],
          },
        },
      },
      include: {
        profile: true,
        posts: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
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
}
