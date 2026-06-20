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
export class AdsSubscriptionsService {
  private stripe: Stripe;

  constructor(private readonly prisma: PrismaService) {
    this.stripe = new Stripe(config.STRIPE_SECRET_KEY || 'sk_test_mock', {
      apiVersion: '2024-12-18.acacia' as any,
    });
  }

  async createCheckoutSession(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { adsSubscription: true },
    });

    if (!user) throw new NotFoundException('User not found');

    let customerId = user.adsSubscription?.stripeCustomerId;

    if (!customerId) {
      // Check if they have a customer ID from the other subscription system
      const existingSubscription = await this.prisma.subscription.findUnique({
        where: { userId },
      });
      
      if (existingSubscription?.stripeCustomerId) {
        customerId = existingSubscription.stripeCustomerId;
      } else {
        const customer = await this.stripe.customers.create({
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          metadata: { userId: user.id },
        });
        customerId = customer.id;
      }

      await this.prisma.adsSubscription.upsert({
        where: { userId },
        create: { userId, stripeCustomerId: customerId, amount: 20.0 },
        update: { stripeCustomerId: customerId },
      });
    }

    try {
      const session = await this.stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{ price: config.STRIPE_ADS_MONTHLY_PRICE_ID, quantity: 1 }],
        mode: 'subscription',
        success_url: config.STRIPE_ADS_SUCCESS_URL,
        cancel_url: config.STRIPE_ADS_CANCEL_URL,
        metadata: { 
          userId: user.id,
          subscriptionType: 'ads'
        },
        subscription_data: { 
          metadata: { 
            userId: user.id,
            subscriptionType: 'ads'
          } 
        },
      });
      return { url: session.url };
    } catch (error: any) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async getMySubscription(userId: string) {
    const sub = await this.prisma.adsSubscription.findUnique({
      where: { userId },
    });
    if (!sub) return { status: 'none', isSubscribed: false };
    const isActive = ['active', 'trialing'].includes(sub.status);
    return { ...sub, isSubscribed: isActive };
  }

  async cancelSubscription(userId: string) {
    const sub = await this.prisma.adsSubscription.findUnique({
      where: { userId },
    });
    if (!sub || !sub.stripeSubscriptionId)
      throw new BadRequestException('No active ads subscription found.');

    try {
      const updatedSubscription = await this.stripe.subscriptions.update(
        sub.stripeSubscriptionId,
        { cancel_at_period_end: true },
      );
      return await this.prisma.adsSubscription.update({
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
    const sub = await this.prisma.adsSubscription.findUnique({
      where: { userId },
    });
    if (!sub || !sub.stripeCustomerId)
      throw new BadRequestException('No Stripe customer found.');

    try {
      const session = await this.stripe.billingPortal.sessions.create({
        customer: sub.stripeCustomerId,
        return_url: config.STRIPE_ADS_CUSTOMER_PORTAL_RETURN_URL,
      });
      return { url: session.url };
    } catch (error: any) {
      throw new InternalServerErrorException(error.message);
    }
  }
}
