import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const userId = req.user.sub || req.user.id;
    const pageNum = Math.max(1, parseInt(page || '1', 10));
    const limitNum = Math.max(1, parseInt(limit || '20', 10));
    return this.notificationsService.getUserNotifications(userId, pageNum, limitNum);
  }

  @Get('unread-count')
  getUnreadCount(@Request() req: any) {
    const userId = req.user.sub || req.user.id;
    return this.notificationsService.getUnreadCount(userId);
  }

  @Patch(':id/read')
  markAsRead(@Request() req: any, @Param('id') id: string) {
    const userId = req.user.sub || req.user.id;
    return this.notificationsService.markAsRead(id, userId);
  }

  @Patch(':id/unread')
  markAsUnread(@Request() req: any, @Param('id') id: string) {
    const userId = req.user.sub || req.user.id;
    return this.notificationsService.markAsUnread(id, userId);
  }

  @Post('mark-all-read')
  markAllAsRead(@Request() req: any) {
    const userId = req.user.sub || req.user.id;
    return this.notificationsService.markAllAsRead(userId);
  }
}
