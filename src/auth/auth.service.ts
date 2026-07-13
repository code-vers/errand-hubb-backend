import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service.js';
import * as bcrypt from 'bcrypt';
import { RegisterClientDto } from './dto/register-client.dto.js';
import { RegisterErrandDto } from './dto/register-errand.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { UserRole, UserStatus } from '@prisma/client';
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
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = new Date();
    verificationTokenExpires.setHours(verificationTokenExpires.getHours() + 24);

    const user = await this.usersService.createUser({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      password: hashedPassword,
      role: UserRole.client,
      status: UserStatus.active,
      isVerified: false,
      verificationToken,
      verificationTokenExpires,
      profileImage,
      profile: {
        create: {
          phone: dto.phone,
          city: dto.city,
          state: dto.state,
        },
      },
    });

    await this.mailService.sendVerificationEmail(user.email, verificationToken);
    await this.recordSecurityLog(user.id, 'ACCOUNT_CREATED');
    return user;
  }

  async registerErrand(dto: RegisterErrandDto, profileImage?: string, gallery: string[] = []) {
    const existingUser = await this.usersService.findOneByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = new Date();
    verificationTokenExpires.setHours(verificationTokenExpires.getHours() + 24);

    const user = await this.usersService.createUser({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      password: hashedPassword,
      role: UserRole.errand,
      status: UserStatus.active,
      isVerified: false,
      verificationToken,
      verificationTokenExpires,
      profileImage,
      profile: {
        create: {
          phone: dto.phone,
          city: dto.city,
          state: dto.state,
          bio: dto.bio,
          services: dto.services,
          youtubeLink: dto.youtubeLink,
          ratePerHour: dto.rate ? parseFloat(dto.rate) : undefined,
          gallery: gallery,
        },
      },
    });

    await this.mailService.sendVerificationEmail(user.email, verificationToken);
    await this.recordSecurityLog(user.id, 'ACCOUNT_CREATED');
    return user;
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

    if (!user.isVerified) {
      throw new UnauthorizedException('Please verify your email before logging in.');
    }

    if (user.status === UserStatus.deactivated) {
      throw new UnauthorizedException('Your account has been blocked by the administrator.');
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

    if (user.status === UserStatus.deactivated) {
      throw new UnauthorizedException('Your account has been blocked by the administrator.');
    }

    // Try verifying TOTP first
    let isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
    });

    // If TOTP fails, check if it's a recovery code
    if (!isValid && user.recoveryCodes?.length > 0) {
      console.log('SERVICE: TOTP failed, checking recovery codes...');
      const recoveryCodeIndex = await this.findRecoveryCodeIndex(
        code,
        user.recoveryCodes,
      );

      if (recoveryCodeIndex !== -1) {
        console.log('SERVICE: Recovery code verified!');
        isValid = true;

        // Remove used recovery code
        const updatedCodes = [...user.recoveryCodes];
        updatedCodes.splice(recoveryCodeIndex, 1);
        await this.usersService.update(userId, { recoveryCodes: updatedCodes });

        // Log recovery code usage
        await this.recordSecurityLog(userId, 'RECOVERY_CODE_USED', req);
      }
    }

    if (!isValid) {
      throw new UnauthorizedException('Invalid 2FA code or recovery code');
    }

    // Record login activity
    if (req) {
      await this.recordLoginActivity(user.id, req);
    }

    return this.generateAuthResponse(user);
  }

  private async findRecoveryCodeIndex(
    code: string,
    hashedCodes: string[],
  ): Promise<number> {
    for (let i = 0; i < hashedCodes.length; i++) {
      const match = await bcrypt.compare(code, hashedCodes[i]);
      if (match) return i;
    }
    return -1;
  }

  async recordLoginActivity(userId: string, req: any) {
    const userAgent = req.headers['user-agent'] || '';
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';

    const parser = new UAParser(userAgent);
    const result = parser.getResult();

    const device = result.device.model || result.os.name || 'Unknown Device';
    const browser =
      `${result.browser.name || 'Unknown Browser'} ${result.browser.version || ''}`.trim();
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

  async recordSecurityLog(userId: string, event: string, req?: any) {
    let device = 'System';
    let browser = 'Server';
    let ipAddress = '127.0.0.1';

    if (req) {
      const userAgent = req.headers['user-agent'] || '';
      ipAddress = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
      const parser = new UAParser(userAgent);
      const result = parser.getResult();
      device = result.device.model || result.os.name || 'Unknown Device';
      browser =
        `${result.browser.name || 'Unknown Browser'} ${result.browser.version || ''}`.trim();
    }

    await this.prisma.securityLog.create({
      data: {
        userId,
        event,
        device,
        browser,
        ipAddress: String(ipAddress),
      },
    });
  }

  async getSecurityLogs(userId: string) {
    return this.prisma.securityLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
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
      console.log(
        'SERVICE: No activity found, recording current session for ID:',
        userId,
      );
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
      role: user.role,
    };

    console.log('--- GENERATING TOKEN ---');
    console.log('User ID:', user.id);

    const accessToken = await this.jwtService.signAsync(payload);

    // Remove sensitive data
    const { password, twoFactorSecret, recoveryCodes, ...result } = user;
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

  async enableTwoFactor(userId: string, code: string, req?: any) {
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

    // Generate 10 backup codes
    const codes = Array.from({ length: 10 }, () =>
      crypto.randomBytes(4).toString('hex').toUpperCase(),
    );

    const hashedCodes = await Promise.all(codes.map((c) => bcrypt.hash(c, 10)));

    await this.usersService.update(userId, {
      isTwoFactorEnabled: true,
      recoveryCodes: hashedCodes,
    });

    await this.recordSecurityLog(userId, 'TWO_FACTOR_ENABLED', req);

    return {
      message: '2FA enabled successfully',
      recoveryCodes: codes,
    };
  }

  async disableTwoFactor(userId: string, req?: any) {
    await this.usersService.update(userId, {
      isTwoFactorEnabled: false,
      twoFactorSecret: null,
      recoveryCodes: [],
    });

    await this.recordSecurityLog(userId, 'TWO_FACTOR_DISABLED', req);

    return { message: '2FA disabled successfully' };
  }

  async forgotPassword(email: string) {
    console.log('SERVICE: forgotPassword started for:', email);
    const user = await this.usersService.findOneByEmail(email);
    if (!user) {
      console.log('SERVICE: User not found for email:', email);
      throw new NotFoundException('User not found');
    }

    console.log('SERVICE: Generating reset token...');
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date();
    expires.setHours(expires.getHours() + 1);

    console.log('SERVICE: Updating user reset token in database...');
    await this.usersService.update(user.id, {
      resetPasswordToken: token,
      resetPasswordExpires: expires,
    });

    console.log('SERVICE: Calling mailService.sendPasswordResetEmail...');
    await this.mailService.sendPasswordResetEmail(user.email, token);
    console.log('SERVICE: mailService.sendPasswordResetEmail completed.');

    console.log('SERVICE: Recording security log...');
    await this.recordSecurityLog(user.id, 'PASSWORD_RESET_REQUESTED');
    console.log('SERVICE: forgotPassword finished successfully.');

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

    await this.recordSecurityLog(user.id, 'PASSWORD_RESET_COMPLETED');

    return { message: 'Password has been reset successfully' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto, req?: any) {
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

    const isPasswordValid = await bcrypt.compare(
      dto.currentPassword,
      user.password,
    );
    if (!isPasswordValid) {
      throw new BadRequestException('Incorrect current password');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    await this.usersService.update(user.id, {
      password: hashedPassword,
    });

    await this.recordSecurityLog(userId, 'PASSWORD_CHANGED', req);

    return { message: 'Password updated successfully' };
  }

  async verifyEmail(token: string) {
    const user = await this.usersService.findByVerificationToken(token);
    if (!user) {
      throw new BadRequestException('Invalid or expired verification link');
    }

    await this.usersService.update(user.id, {
      isVerified: true,
      verificationToken: null,
      verificationTokenExpires: null,
    });

    await this.recordSecurityLog(user.id, 'EMAIL_VERIFIED');

    return { message: 'Email verified successfully' };
  }

  async resendVerificationEmail(email: string) {
    const user = await this.usersService.findOneByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isVerified) {
      throw new BadRequestException('Email is already verified');
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = new Date();
    verificationTokenExpires.setHours(verificationTokenExpires.getHours() + 24);

    await this.usersService.update(user.id, {
      verificationToken,
      verificationTokenExpires,
    });

    await this.mailService.sendVerificationEmail(user.email, verificationToken);

    return { message: 'Verification email sent successfully' };
  }
}
