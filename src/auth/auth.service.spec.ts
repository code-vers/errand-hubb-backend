import { jest, describe, beforeEach, it, expect } from '@jest/globals';
import { AuthService } from './auth.service.js';
import { UsersService } from '../users/users.service.js';
import { JwtService } from '@nestjs/jwt';
import { MailService } from '../mail/mail.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { createMockPrismaService } from '../test-utils/mock-prisma.js';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let mockUsersService: jest.Mocked<Partial<UsersService>>;
  let mockJwtService: jest.Mocked<Partial<JwtService>>;
  let mockMailService: jest.Mocked<Partial<MailService>>;
  let mockNotificationsService: any;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    mockUsersService = {
      findOneByEmail: jest.fn<any>().mockResolvedValue(null),
      createUser: jest.fn<any>().mockImplementation((data: any) => Promise.resolve({ id: 'u-1', email: data.email, ...data })),
      findOneById: jest.fn<any>().mockResolvedValue({ id: 'u-1', email: 'test@example.com' }),
      findByVerificationToken: jest.fn<any>().mockResolvedValue(null),
      update: jest.fn<any>().mockResolvedValue({ id: 'u-1' }),
    };
    mockJwtService = {
      sign: jest.fn<any>().mockReturnValue('mock-jwt-token'),
      signAsync: jest.fn<any>().mockResolvedValue('mock-jwt-token'),
    };
    mockMailService = {
      sendVerificationEmail: jest.fn<any>().mockResolvedValue(true),
      sendPasswordResetEmail: jest.fn<any>().mockResolvedValue(true),
      send2faStatusEmail: jest.fn<any>().mockResolvedValue(true),
    };
    mockNotificationsService = {
      createNotification: jest.fn<any>().mockResolvedValue({ id: 'notif-1' }),
      notifyAdmins: jest.fn<any>().mockResolvedValue(true),
    };

    service = new AuthService(
      mockUsersService as unknown as UsersService,
      mockJwtService as unknown as JwtService,
      mockMailService as unknown as MailService,
      mockPrisma,
      mockNotificationsService as unknown as NotificationsService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('registerClient', () => {
    it('should throw ConflictException if user already exists', async () => {
      mockUsersService.findOneByEmail?.mockResolvedValueOnce({ id: 'u-1', email: 'alice@example.com' } as any);
      await expect(
        service.registerClient({
          firstName: 'Alice',
          lastName: 'Smith',
          email: 'alice@example.com',
          password: 'password123',
          termsAccepted: true,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should register client successfully', async () => {
      const result = await service.registerClient({
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'alice@example.com',
        password: 'password123',
        termsAccepted: true,
      });
      expect(mockUsersService.createUser).toHaveBeenCalled();
      expect(mockMailService.sendVerificationEmail).toHaveBeenCalled();
      expect(result).toHaveProperty('id', 'u-1');
      expect(result).toHaveProperty('email', 'alice@example.com');
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException for invalid email', async () => {
      mockUsersService.findOneByEmail?.mockResolvedValueOnce(null);
      await expect(
        service.login({ email: 'nonexistent@example.com', password: 'password123' }, {}),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return accessToken for valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      mockUsersService.findOneByEmail?.mockResolvedValueOnce({
        id: 'u-1',
        email: 'alice@example.com',
        password: hashedPassword,
        role: 'client',
        status: 'active',
        isVerified: true,
        twoFactorEnabled: false,
      } as any);

      const result = await service.login({ email: 'alice@example.com', password: 'password123' }, { headers: {} });
      expect(result).toHaveProperty('accessToken', 'mock-jwt-token');
    });
  });

  describe('verifyEmail', () => {
    it('should throw BadRequestException if token is invalid or expired', async () => {
      mockUsersService.findByVerificationToken?.mockResolvedValueOnce(null);
      await expect(service.verifyEmail('invalid-token')).rejects.toThrow(BadRequestException);
    });

    it('should verify email and update user status', async () => {
      mockUsersService.findByVerificationToken?.mockResolvedValueOnce({
        id: 'u-1',
        email: 'test@example.com',
      } as any);

      const result = await service.verifyEmail('valid-token');
      expect(mockUsersService.update).toHaveBeenCalledWith('u-1', {
        isVerified: true,
        verificationToken: null,
        verificationTokenExpires: null,
      });
      expect(result.message).toBe('Email verified successfully');
    });
  });
});
