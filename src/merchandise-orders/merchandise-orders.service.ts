import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { MerchandiseOrderStatus } from '@prisma/client';

import Stripe from 'stripe';

@Injectable()
export class MerchandiseOrdersService {
  private stripe: Stripe;

  constructor(private prisma: PrismaService) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
      apiVersion: '2025-02-24.acacia' as any,
    });
  }

  async create(data: any) {
    const order = await this.prisma.merchandiseOrder.create({
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
        isPaid: false,
      },
    });

    // Create Stripe line items
    const lineItems = (data.items as any[]).map((item) => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.name,
        },
        unit_amount: Math.round(item.price * 100), // Stripe takes cents
      },
      quantity: item.quantity,
    }));

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${frontendUrl}/merchandise/cart?success=true`,
      cancel_url: `${frontendUrl}/merchandise/cart?canceled=true`,
      metadata: {
        orderId: order.id,
        type: 'merchandise',
      },
      customer_email: data.email,
    });

    await this.prisma.merchandiseOrder.update({
      where: { id: order.id },
      data: { stripeSessionId: session.id },
    });

    return { order, checkoutUrl: session.url };
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
