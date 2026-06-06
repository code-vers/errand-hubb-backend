import { Injectable, UnauthorizedException, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service.js';
import * as bcrypt from 'bcrypt';
import { RegisterClientDto } from './dto/register-client.dto.js';
import { RegisterErrandDto } from './dto/register-errand.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { UserRole } from '../generated/prisma/enums.js';
import { MailService } from '../mail/mail.service.js';
import * as crypto from 'crypto';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { PrismaService } from '../prisma/prisma.service.js';
import { UAParser } from 'ua-parser-js';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly prisma: PrismaService,
  ) {}

  async registerClient(dto: RegisterClientDto, profileImage?: string) {
    const existingUser = await this.usersService.findOneByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    return this.usersService.createUser({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      password: hashedPassword,
      role: UserRole.client,
      profileImage,
      profile: {
        create: {
          phone: dto.phone,
          city: dto.city,
          state: dto.state,
        },
      },
    });
  }

  async registerErrand(dto: RegisterErrandDto, profileImage?: string) {
    const existingUser = await this.usersService.findOneByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    return this.usersService.createUser({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      password: hashedPassword,
      role: UserRole.errand,
      profileImage,
      profile: {
        create: {
          phone: dto.phone,
          city: dto.city,
          state: dto.state,
          bio: dto.bio,
          services: dto.services,
          ratePerHour: dto.rate ? parseFloat(dto.rate) : undefined,
        },
      },
    });
  }

  async login(dto: LoginDto, req?: any) {
    const user = await this.usersService.findOneByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if 2FA is enabled
    if (user.isTwoFactorEnabled) {
      return {
        mfaRequired: true,
        userId: user.id,
      };
    }

    // Record login activity if successful and 2FA not required
    if (req) {
      await this.recordLoginActivity(user.id, req);
    }

    return this.generateAuthResponse(user);
  }

  async verifyTwoFactorLogin(userId: string, code: string, req?: any) {
    const user = await this.usersService.findOneById(userId);
    if (!user || !user.twoFactorSecret) {
      throw new UnauthorizedException('Invalid request');
    }

    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
    });

    if (!isValid) {
      throw new UnauthorizedException('Invalid 2FA code');
    }

    // Record login activity
    if (req) {
      await this.recordLoginActivity(user.id, req);
    }

    return this.generateAuthResponse(user);
  }

  async recordLoginActivity(userId: string, req: any) {
    const userAgent = req.headers['user-agent'] || '';
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
    
    const parser = new UAParser(userAgent);
    const result = parser.getResult();

    const device = result.device.model || result.os.name || 'Unknown Device';
    const browser = `${result.browser.name || 'Unknown Browser'} ${result.browser.version || ''}`.trim();
    const os = `${result.os.name || ''} ${result.os.version || ''}`.trim();
    
    let deviceIcon = 'globe';
    if (result.device.type === 'mobile') deviceIcon = 'smartphone';
    else if (result.device.type === 'tablet') deviceIcon = 'tablet';
    else if (!result.device.type) deviceIcon = 'laptop';

    await this.prisma.loginActivity.create({
      data: {
        userId,
        device,
        browser,
        os,
        ipAddress: String(ipAddress),
        location: 'Detected Login', // In a real app, use GeoIP
        deviceIcon,
        status: 'active',
      },
    });
  }

  async getLoginActivity(userId: string, req?: any) {
    const activities = await this.prisma.loginActivity.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // If no activities exist and we have the request, record the current session 
    // so the user sees something immediately without having to re-login.
    if (activities.length === 0 && req) {
      console.log('SERVICE: No activity found, recording current session for ID:', userId);
      await this.recordLoginActivity(userId, req);
      return this.prisma.loginActivity.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
    }

    return activities;
  }

  private async generateAuthResponse(user: any) {
    // Using both id and sub to be as compatible as possible
    const payload = { 
      id: user.id, 
      sub: user.id, 
      email: user.email, 
      role: user.role 
    };
    
    console.log('--- GENERATING TOKEN ---');
    console.log('User ID:', user.id);
    
    const accessToken = await this.jwtService.signAsync(payload);

    // Remove sensitive data
    const { password, twoFactorSecret, ...result } = user;
    return {
      user: result,
      accessToken,
    };
  }

  async generateTwoFactorSecret(userId: string) {
    const user = await this.usersService.findOneById(userId);
    if (!user) throw new NotFoundException('User not found');

    const secret = speakeasy.generateSecret({
      name: `ErrandHub (${user.email})`,
    });

    const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url || '');

    await this.usersService.update(userId, {
      twoFactorSecret: secret.base32,
    });

    return {
      secret: secret.base32,
      qrCode: qrCodeDataUrl,
    };
  }

  async enableTwoFactor(userId: string, code: string) {
    const user = await this.usersService.findOneById(userId);
    if (!user || !user.twoFactorSecret) {
      throw new BadRequestException('2FA secret not generated');
    }

    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
    });

    if (!isValid) {
      throw new BadRequestException('Invalid 2FA code');
    }

    await this.usersService.update(userId, {
      isTwoFactorEnabled: true,
    });

    return { message: '2FA enabled successfully' };
  }

  async disableTwoFactor(userId: string) {
    await this.usersService.update(userId, {
      isTwoFactorEnabled: false,
      twoFactorSecret: null,
    });

    return { message: '2FA disabled successfully' };
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findOneByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date();
    expires.setHours(expires.getHours() + 1);

    await this.usersService.update(user.id, {
      resetPasswordToken: token,
      resetPasswordExpires: expires,
    });

    await this.mailService.sendPasswordResetEmail(user.email, token);

    return { message: 'Password reset email sent' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.usersService.findByResetToken(dto.token);
    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    await this.usersService.update(user.id, {
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpires: null,
    });

    return { message: 'Password has been reset successfully' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    console.log('--- CHANGE PASSWORD REQUEST ---');
    console.log('User ID from token:', userId);
    
    if (!userId) {
      throw new UnauthorizedException('User ID missing from token');
    }

    const user = await this.usersService.findOneById(userId);
    if (!user) {
      console.error('FAILED: User not found for ID:', userId);
      throw new NotFoundException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException('Incorrect current password');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    await this.usersService.update(user.id, {
      password: hashedPassword,
    });

    return { message: 'Password updated successfully' };
  }
}
