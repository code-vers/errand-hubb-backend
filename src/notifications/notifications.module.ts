import { Module, forwardRef } from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';
import { NotificationsController } from './notifications.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { MessagesModule } from '../messages/messages.module.js';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => MessagesModule),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
