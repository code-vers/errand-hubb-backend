import { jest, describe, beforeEach, it, expect } from '@jest/globals';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<Partial<AuthService>>;
  let mockResponse: any;

  beforeEach(() => {
    authService = {
      registerClient: jest.fn<any>().mockResolvedValue({ user: { id: 'u-1', role: 'client' }, message: 'Registered' }),
      registerErrand: jest.fn<any>().mockResolvedValue({ user: { id: 'u-2', role: 'errand' }, message: 'Registered' }),
      login: jest.fn<any>().mockResolvedValue({ accessToken: 'jwt-token-123', user: { id: 'u-1' } }),
      verifyTwoFactorLogin: jest.fn<any>().mockResolvedValue({ accessToken: 'jwt-token-123', user: { id: 'u-1' } }),
      getLoginActivity: jest.fn<any>().mockResolvedValue([]),
      getSecurityLogs: jest.fn<any>().mockResolvedValue([]),
      generateTwoFactorSecret: jest.fn<any>().mockResolvedValue({ secret: 'mock-secret', qrCode: 'data:image/png...' }),
      enableTwoFactor: jest.fn<any>().mockResolvedValue({ message: '2FA enabled' }),
      disableTwoFactor: jest.fn<any>().mockResolvedValue({ message: '2FA disabled' }),
      verifyEmail: jest.fn<any>().mockResolvedValue({ message: 'Email verified' }),
      resendVerificationEmail: jest.fn<any>().mockResolvedValue({ message: 'Verification email sent' }),
      forgotPassword: jest.fn<any>().mockResolvedValue({ message: 'Password reset link sent' }),
      resetPassword: jest.fn<any>().mockResolvedValue({ message: 'Password reset successfully' }),
      changePassword: jest.fn<any>().mockResolvedValue({ message: 'Password changed successfully' }),
    };

    mockResponse = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    };

    controller = new AuthController(authService as unknown as AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('registerClient', () => {
    it('should call authService.registerClient', async () => {
      const dto: any = { firstName: 'Alice', lastName: 'Doe', email: 'alice@example.com', password: 'password123' };
      const result = await controller.registerClient(dto);
      expect(authService.registerClient).toHaveBeenCalledWith(dto, undefined);
      expect(result).toEqual({ user: { id: 'u-1', role: 'client' }, message: 'Registered' });
    });
  });

  describe('login', () => {
    it('should return token and set cookie', async () => {
      const dto = { email: 'alice@example.com', password: 'password123' };
      const req = { headers: {} };
      const result = await controller.login(dto, req, mockResponse);
      expect(authService.login).toHaveBeenCalledWith(dto, req);
      expect(mockResponse.cookie).toHaveBeenCalledWith('access_token', 'jwt-token-123', expect.any(Object));
      expect(result).toHaveProperty('accessToken');
    });
  });

  describe('logout', () => {
    it('should clear access_token cookie', async () => {
      const result = await controller.logout(mockResponse);
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('access_token');
      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });

  describe('verifyEmail', () => {
    it('should verify email with token', async () => {
      const result = await controller.verifyEmail('token-123');
      expect(authService.verifyEmail).toHaveBeenCalledWith('token-123');
      expect(result).toEqual({ message: 'Email verified' });
    });
  });

  describe('changePassword', () => {
    it('should delegate password change to authService', async () => {
      const req = { user: { sub: 'u-1' } };
      const dto = { currentPassword: 'oldPassword123', newPassword: 'newPassword123' };
      const result = await controller.changePassword(req, dto);
      expect(authService.changePassword).toHaveBeenCalledWith('u-1', dto);
      expect(result).toEqual({ message: 'Password changed successfully' });
    });
  });
});
