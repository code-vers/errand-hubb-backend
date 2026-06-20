import { Module } from '@nestjs/common';
import { AdsSubscriptionsService } from './ads-subscriptions.service.js';
import { AdsSubscriptionsController } from './ads-subscriptions.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [AdsSubscriptionsController],
  providers: [AdsSubscriptionsService],
  exports: [AdsSubscriptionsService],
})
export class AdsSubscriptionsModule {}
