import { Controller, Get, Post, Body, Patch, Param, BadRequestException } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { MerchandiseOrdersService } from './merchandise-orders.service.js';
import { MerchandiseOrderStatus } from '@prisma/client';

@ApiTags('Merchandise Orders')
@Controller('merchandise-orders')
export class MerchandiseOrdersController {
  constructor(private readonly merchandiseOrdersService: MerchandiseOrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Place a merchandise order and generate Stripe checkout payment URL' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'email', 'address', 'city', 'state', 'zipCode', 'items', 'totalAmount'],
      properties: {
        name: { type: 'string', example: 'Alice Smith' },
        email: { type: 'string', example: 'alice@example.com' },
        address: { type: 'string', example: '123 Main St' },
        city: { type: 'string', example: 'Austin' },
        state: { type: 'string', example: 'TX' },
        zipCode: { type: 'string', example: '78701' },
        totalAmount: { type: 'number', example: 35.0 },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', example: 'ErrandHub T-Shirt' },
              price: { type: 'number', example: 25.0 },
              quantity: { type: 'number', example: 1 },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Order created with checkoutUrl' })
  create(@Body() createData: any) {
    return this.merchandiseOrdersService.create(createData);
  }

  @Get()
  @ApiOperation({ summary: 'List all merchandise store orders' })
  @ApiResponse({ status: 200, description: 'List of merchandise orders' })
  findAll() {
    return this.merchandiseOrdersService.findAll();
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update shipping / fulfillment status of merchandise order' })
  @ApiParam({ name: 'id', description: 'Order UUID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['status'],
      properties: {
        status: { type: 'string', enum: ['pending', 'accepted', 'shipped', 'delivered', 'cancelled'], example: 'shipped' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Updated order status' })
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    const validStatuses = ['pending', 'accepted', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException('Invalid status');
    }
    return this.merchandiseOrdersService.updateStatus(id, status as MerchandiseOrderStatus);
  }
}
