import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getAdminStats() {
    // 1. Stats Data
    const totalUsers = await this.prisma.user.count();
    
    // Instead of total errands, use Total Merchandise Orders as requested in plan
    const totalMerchandiseOrders = await this.prisma.merchandiseOrder.count();

    const activeErrands = await this.prisma.serviceRequest.count({
      where: { status: 'active' },
    });

    // Instead of Paused Errands, use Total Revenue
    const paymentHistories = await this.prisma.paymentHistory.findMany({
      where: { status: 'succeeded' },
      select: { amountPaid: true }
    });
    const merchOrders = await this.prisma.merchandiseOrder.findMany({
      where: { status: { not: 'cancelled' } },
      select: { totalAmount: true }
    });
    
    let totalRevenue = 0;
    paymentHistories.forEach(p => totalRevenue += Number(p.amountPaid));
    merchOrders.forEach(m => totalRevenue += Number(m.totalAmount));

    const totalOpenPosts = await this.prisma.post.count();
    
    const completedJobs = await this.prisma.serviceRequest.count({
      where: { status: 'completed' },
    });

    // 2. Growth Data (Last 6 months users)
    const growthData: { month: string, value: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      
      const count = await this.prisma.user.count({
        where: {
          createdAt: {
            gte: monthStart,
            lte: monthEnd
          }
        }
      });
      
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      growthData.push({
        month: monthNames[d.getMonth()],
        value: count
      });
    }

    // 3. Weekly Activity (Service Requests created this week)
    const weeklyActivity: { day: string, value: number }[] = [];
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const today = new Date();
    
    // Start of current week (Sunday)
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
      const dayStart = new Date(startOfWeek);
      dayStart.setDate(startOfWeek.getDate() + i);
      
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayStart.getDate() + 1);

      const count = await this.prisma.serviceRequest.count({
        where: {
          createdAt: {
            gte: dayStart,
            lt: dayEnd
          }
        }
      });

      // Shift the day to match UI ("Mon" to "Sun" usually, but here just use the standard JS day)
      // Actually the UI wants Mon to Sun, so let's map: 
      // i=1 (Mon) -> ... i=6 (Sat), i=0 (Sun)
      weeklyActivity.push({
        day: days[dayStart.getDay()],
        value: count
      });
    }
    
    // Sort weeklyActivity so Mon is first
    const uiDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    weeklyActivity.sort((a, b) => uiDays.indexOf(a.day) - uiDays.indexOf(b.day));

    // 4. Recent Activities (Recent Users)
    const recentUsers = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 6,
    });
    
    const recentActivities = recentUsers.map(user => {
      const now = new Date().getTime();
      const created = user.createdAt.getTime();
      const diffMins = Math.floor((now - created) / 60000);
      let timeAgo = `${diffMins}m ago`;
      if (diffMins > 60) {
        timeAgo = `${Math.floor(diffMins / 60)}h ago`;
      }
      if (diffMins > 1440) {
        timeAgo = `${Math.floor(diffMins / 1440)}d ago`;
      }

      return {
        id: user.id,
        user: { 
          initials: user.firstName[0].toUpperCase() + user.lastName[0].toUpperCase(), 
          name: `${user.firstName} ${user.lastName}`,
          avatarColor: user.role === 'admin' ? '#ef4444' : '#3b82f6'
        },
        action: `New ${user.role} Registered`,
        status: { label: "New", type: "new" },
        timestamp: user.createdAt.toISOString(),
        timeAgo: timeAgo,
      };
    });

    return {
      stats: {
        totalUsers,
        totalMerchandiseOrders,
        activeErrands,
        totalRevenue,
        totalOpenPosts,
        completedJobs
      },
      growthData,
      weeklyActivity,
      recentActivities
    };
  }
}
