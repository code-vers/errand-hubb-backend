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

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
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

  async login(dto: LoginDto) {
    const user = await this.usersService.findOneByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Using both id and sub to be as compatible as possible
    const payload = { 
      id: user.id, 
      sub: user.id, 
      email: user.email, 
      role: user.role 
    };
    
    console.log('--- LOGIN SUCCESS ---');
    console.log('Generating token for User ID:', user.id);
    
    const accessToken = await this.jwtService.signAsync(payload);

    // Remove password from user object
    const { password, ...result } = user;
    return {
      user: result,
      accessToken,
    };
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
