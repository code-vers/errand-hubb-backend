import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { MerchandiseOrderStatus } from '@prisma/client';

@Injectable()
export class MerchandiseOrdersService {
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    return this.prisma.merchandiseOrder.create({
      data: {
        name: data.name,
        email: data.email,
        address: data.address,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        items: data.items,
        totalAmount: data.totalAmount,
        status: 'pending',
      },
    });
  }

  async findAll() {
    return this.prisma.merchandiseOrder.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(id: string, status: MerchandiseOrderStatus) {
    const order = await this.prisma.merchandiseOrder.findUnique({
      where: { id },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return this.prisma.merchandiseOrder.update({
      where: { id },
      data: { status },
    });
  }
}
