import { Module } from '@nestjs/common';
import { MerchandiseOrdersController } from './merchandise-orders.controller.js';
import { MerchandiseOrdersService } from './merchandise-orders.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [MerchandiseOrdersController],
  providers: [MerchandiseOrdersService]
})
export class MerchandiseOrdersModule {}
