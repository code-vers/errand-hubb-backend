import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { config } from '../config/config.js';
import Stripe from 'stripe';

@Injectable()
export class SubscriptionsService {
  private stripe: Stripe;

  constructor(private readonly prisma: PrismaService) {
    this.stripe = new Stripe(config.STRIPE_SECRET_KEY || 'sk_test_mock', {
      apiVersion: '2024-12-18.acacia' as any,
    });
  }

  async createCheckoutSession(userId: string, plan: 'monthly' | 'yearly' = 'monthly') {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });

    if (!user) throw new NotFoundException('User not found');
    if (user.role !== 'errand')
      throw new BadRequestException(
        'Only Errand users can subscribe to this plan.',
      );

    let customerId = user.subscription?.stripeCustomerId;

    if (!customerId) {
      const customer = await this.stripe.customers.create({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
    }

    const amount = plan === 'yearly' ? 50.0 : 5.0;
    await this.prisma.subscription.upsert({
      where: { userId },
      create: { userId, stripeCustomerId: customerId, amount },
      update: { stripeCustomerId: customerId, amount },
    });

    try {
      const priceId = plan === 'yearly' ? config.STRIPE_YEARLY_PRICE_ID : config.STRIPE_MONTHLY_PRICE_ID;
      const session = await this.stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: 'subscription',
        success_url: config.STRIPE_SUCCESS_URL,
        cancel_url: config.STRIPE_CANCEL_URL,
        metadata: { userId: user.id, plan },
        subscription_data: { metadata: { userId: user.id, plan } },
      });
      return { url: session.url };
    } catch (error: any) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async getMySubscription(userId: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
    });
    if (!sub) return { status: 'none', isSubscribed: false };
    const isActive = ['active', 'trialing'].includes(sub.status);
    return { ...sub, isSubscribed: isActive };
  }

  async cancelSubscription(userId: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
    });
    if (!sub || !sub.stripeSubscriptionId)
      throw new BadRequestException('No active subscription found.');

    try {
      const updatedSubscription = await this.stripe.subscriptions.update(
        sub.stripeSubscriptionId,
        { cancel_at_period_end: true },
      );
      return await this.prisma.subscription.update({
        where: { id: sub.id },
        data: {
          cancelAtPeriodEnd: updatedSubscription.cancel_at_period_end,
          status: updatedSubscription.status as any,
        },
      });
    } catch (error: any) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async createCustomerPortal(userId: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
    });
    if (!sub || !sub.stripeCustomerId)
      throw new BadRequestException('No Stripe customer found.');

    try {
      const session = await this.stripe.billingPortal.sessions.create({
        customer: sub.stripeCustomerId,
        return_url: config.STRIPE_CUSTOMER_PORTAL_RETURN_URL,
      });
      return { url: session.url };
    } catch (error: any) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async getAllSubscriptions(query: any) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, parseInt(query.limit || '10', 10));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status && query.status !== 'all') where.status = query.status;
    if (query.search) {
      where.user = {
        OR: [
          { email: { contains: query.search, mode: 'insensitive' } },
          { firstName: { contains: query.search, mode: 'insensitive' } },
          { lastName: { contains: query.search, mode: 'insensitive' } },
        ],
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.subscription.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getSubscriptionDetails(id: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        paymentHistories: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!sub) throw new NotFoundException('Subscription not found');
    return sub;
  }

  async getAllPayments(query: any) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, parseInt(query.limit || '10', 10));
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.paymentHistory.findMany({
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.paymentHistory.count(),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getPaymentDetails(id: string) {
    const payment = await this.prisma.paymentHistory.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }
}
