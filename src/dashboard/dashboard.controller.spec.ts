import { jest, describe, beforeEach, it, expect } from '@jest/globals';
import { DashboardController } from './dashboard.controller.js';
import { DashboardService } from './dashboard.service.js';

describe('DashboardController', () => {
  let controller: DashboardController;
  let service: jest.Mocked<Partial<DashboardService>>;

  beforeEach(() => {
    service = {
      getAdminStats: jest.fn<any>().mockResolvedValue({
        stats: {
          totalUsers: 10,
          totalMerchandiseOrders: 5,
          activeErrands: 2,
          totalRevenue: 500,
          totalOpenPosts: 8,
          completedJobs: 3,
        },
        growthData: [],
        weeklyActivity: [],
        recentActivities: [],
      }),
    };

    controller = new DashboardController(service as unknown as DashboardService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAdminStats', () => {
    it('should return admin stats from service', async () => {
      const result = await controller.getAdminStats();
      expect(service.getAdminStats).toHaveBeenCalled();
      expect(result.stats.totalUsers).toBe(10);
      expect(result.stats.totalRevenue).toBe(500);
    });
  });
});
