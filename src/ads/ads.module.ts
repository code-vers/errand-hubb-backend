import { Module } from '@nestjs/common';
import { AdsService } from './ads.service.js';
import { AdsController } from './ads.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [AdsController],
  providers: [AdsService],
  exports: [AdsService],
})
export class AdsModule {}
