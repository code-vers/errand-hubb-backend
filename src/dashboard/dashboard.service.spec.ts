import { jest, describe, beforeEach, it, expect } from '@jest/globals';
import { DashboardService } from './dashboard.service.js';
import { createMockPrismaService } from '../test-utils/mock-prisma.js';

describe('DashboardService', () => {
  let service: DashboardService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    mockPrisma.user.count.mockResolvedValue(25);
    mockPrisma.merchandiseOrder.count.mockResolvedValue(10);
    mockPrisma.serviceRequest.count.mockResolvedValue(4);
    mockPrisma.post.count.mockResolvedValue(15);
    mockPrisma.paymentHistory = {
      findMany: jest.fn<any>().mockResolvedValue([{ amountPaid: 150 }, { amountPaid: 250 }]),
    };
    mockPrisma.merchandiseOrder.findMany.mockResolvedValue([{ totalAmount: 100 }]);
    mockPrisma.user.findMany.mockResolvedValue([
      {
        id: 'u-1',
        firstName: 'Alice',
        lastName: 'Smith',
        role: 'client',
        createdAt: new Date(),
      },
    ]);

    service = new DashboardService(mockPrisma);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAdminStats', () => {
    it('should aggregate and calculate stats, revenue, growth, and activities', async () => {
      const result = await service.getAdminStats();
      expect(result.stats).toBeDefined();
      expect(result.stats.totalUsers).toBe(25);
      expect(result.stats.totalRevenue).toBe(500); // 150 + 250 + 100
      expect(result.growthData).toHaveLength(6);
      expect(result.weeklyActivity).toHaveLength(7);
      expect(result.recentActivities).toHaveLength(1);
      expect(result.recentActivities[0].user.name).toBe('Alice Smith');
    });
  });
});
