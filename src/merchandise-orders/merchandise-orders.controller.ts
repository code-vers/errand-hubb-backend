import { Controller, Get, Post, Body, Patch, Param, BadRequestException } from '@nestjs/common';
import { MerchandiseOrdersService } from './merchandise-orders.service.js';
import { MerchandiseOrderStatus } from '@prisma/client';

@Controller('merchandise-orders')
export class MerchandiseOrdersController {
  constructor(private readonly merchandiseOrdersService: MerchandiseOrdersService) {}

  @Post()
  create(@Body() createData: any) {
    return this.merchandiseOrdersService.create(createData);
  }

  @Get()
  findAll() {
    return this.merchandiseOrdersService.findAll();
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    const validStatuses = ['pending', 'accepted', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException('Invalid status');
    }
    return this.merchandiseOrdersService.updateStatus(id, status as MerchandiseOrderStatus);
  }
}
