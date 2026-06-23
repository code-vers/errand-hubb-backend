import { Injectable, Inject, forwardRef, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { MessagesGateway } from '../messages/messages.gateway.js';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => MessagesGateway))
    private readonly messagesGateway: any,
  ) {}

  async createNotification(userId: string, data: { type: string; title: string; message: string; metadata?: any }) {
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type: data.type,
        title: data.title,
        message: data.message,
        metadata: data.metadata || {},
      },
    });

    // Broadcast in real-time
    try {
      this.messagesGateway.server.to(`user_${userId}`).emit('notification_received', notification);
    } catch (err: any) {
      console.error('NOTIFICATIONS: Failed to emit real-time notification:', err.message);
    }

    return notification;
  }

  async getUserNotifications(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({
        where: { userId },
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { count };
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    const updated = await this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    // Notify frontend of unread count change
    this.emitUnreadCountUpdate(userId);

    return updated;
  }

  async markAsUnread(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    const updated = await this.prisma.notification.update({
      where: { id },
      data: { isRead: false },
    });

    // Notify frontend of unread count change
    this.emitUnreadCountUpdate(userId);

    return updated;
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    // Notify frontend of unread count change
    this.emitUnreadCountUpdate(userId);

    return { success: true };
  }

  private async emitUnreadCountUpdate(userId: string) {
    try {
      const { count } = await this.getUnreadCount(userId);
      this.messagesGateway.server.to(`user_${userId}`).emit('unread_notifications_count', { count });
    } catch (err: any) {
      console.error('NOTIFICATIONS: Failed to emit unread count update:', err.message);
    }
  }
}
