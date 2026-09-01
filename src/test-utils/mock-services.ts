import { jest } from '@jest/globals';

export const createMockJwtService = () => ({
  signAsync: jest.fn<any>().mockResolvedValue('mock-jwt-token'),
  sign: jest.fn<any>().mockReturnValue('mock-jwt-token'),
  verifyAsync: jest.fn<any>().mockResolvedValue({ sub: 'user-id-123', email: 'test@example.com', role: 'client' }),
  verify: jest.fn<any>().mockReturnValue({ sub: 'user-id-123', email: 'test@example.com', role: 'client' }),
});

export const createMockNotificationsService = () => ({
  createNotification: jest.fn<any>().mockResolvedValue({ id: 'notif-123', title: 'Test', message: 'Test message' }),
  findAllForUser: jest.fn<any>().mockResolvedValue({ data: [], total: 0 }),
  markAsRead: jest.fn<any>().mockResolvedValue({ id: 'notif-123', isRead: true }),
  markAllAsRead: jest.fn<any>().mockResolvedValue({ count: 1 }),
  remove: jest.fn<any>().mockResolvedValue({ id: 'notif-123' }),
});

export const createMockEmailService = () => ({
  sendVerificationEmail: jest.fn<any>().mockResolvedValue(true),
  sendPasswordResetEmail: jest.fn<any>().mockResolvedValue(true),
  sendAccountDeletionEmail: jest.fn<any>().mockResolvedValue(true),
  sendOrderConfirmationEmail: jest.fn<any>().mockResolvedValue(true),
  sendEmail: jest.fn<any>().mockResolvedValue(true),
});

export const createMockConfigService = () => ({
  get: jest.fn<any>().mockImplementation((key: string) => {
    const configMap: Record<string, string> = {
      JWT_SECRET: 'test-secret',
      JWT_EXPIRATION: '1d',
      STRIPE_SECRET_KEY: 'sk_test_mock',
      STRIPE_WEBHOOK_SECRET: 'whsec_mock',
      FRONTEND_URL: 'http://localhost:3000',
    };
    return configMap[key] || 'mock-value';
  }),
});
