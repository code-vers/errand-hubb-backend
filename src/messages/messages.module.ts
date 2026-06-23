import { Module, forwardRef } from '@nestjs/common';
import { MessagesService } from './messages.service.js';
import { MessagesGateway } from './messages.gateway.js';
import { MessagesController } from './messages.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => NotificationsModule),
  ],
  controllers: [MessagesController],
  providers: [MessagesService, MessagesGateway],
  exports: [MessagesService, MessagesGateway],
})
export class MessagesModule {}
