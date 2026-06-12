import { Module } from '@nestjs/common';
import { MessagesService } from './messages.service.js';
import { MessagesGateway } from './messages.gateway.js';
import { MessagesController } from './messages.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [
    PrismaModule,
  ],
  controllers: [MessagesController],
  providers: [MessagesService, MessagesGateway],
  exports: [MessagesService],
})
export class MessagesModule {}
