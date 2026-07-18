import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { MailService } from '../mail/mail.service.js';
import Stripe from 'stripe';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async handleStripeEvent(event: Stripe.Event) {
    this.logger.log(`Processing Stripe Event: ${event.type} (${event.id})`);

    try {
      const existingEvent = await this.prisma.webhookEvent.findUnique({
        where: { stripeEventId: event.id },
      });

      if (existingEvent) {
        this.logger.log(`Event ${event.id} already processed. Skipping.`);
        return { received: true };
      }

      await this.prisma.webhookEvent.create({
        data: {
          stripeEventId: event.id,
          type: event.type,
        },
      });

      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutSessionCompleted(event.data.object as any);
          break;
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          await this.handleSubscriptionUpdated(event.data.object as any);
          break;
        case 'invoice.payment_succeeded':
          await this.handleInvoicePaymentSucceeded(event.data.object as any);
          break;
        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object as any);
          break;
        default:
          this.logger.log('Unhandled event type: ' + event.type);
      }

      await this.prisma.webhookEvent.update({
        where: { stripeEventId: event.id },
        data: { processed: true },
      });

      this.logger.log(`Successfully processed event: ${event.type}`);
      return { received: true };
    } catch (error: any) {
      this.logger.error(`Error processing webhook ${event.type}:`, error.message);
      await this.prisma.webhookEvent
        .update({
          where: { stripeEventId: event.id },
          data: { processingError: error.message },
        })
        .catch(() => null);
      throw error;
    }
  }

  private async handleCheckoutSessionCompleted(session: any) {
    this.logger.log(`Handling checkout.session.completed for session: ${session.id}`);

    const metadataType = session.metadata?.type || (session as any).subscription_data?.metadata?.type;
    
    if (metadataType === 'merchandise') {
      const orderId = session.metadata?.orderId;
      if (orderId) {
        await this.prisma.merchandiseOrder.update({
          where: { id: orderId },
          data: { isPaid: true },
        });
        this.logger.log(`Merchandise Order ${orderId} marked as paid.`);
      }
      return;
    }
    
    if (session.mode === 'subscription' && session.subscription) {
      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;
      
      const userId = (session.metadata?.userId || (session as any).subscription_data?.metadata?.userId) as string;
      const subscriptionType = (session.metadata?.subscriptionType || (session as any).subscription_data?.metadata?.subscriptionType) as string;
      const plan = (session.metadata?.plan || (session as any).subscription_data?.metadata?.plan) as string;

      this.logger.log(`Metadata check - userId: ${userId}, type: ${subscriptionType}, customerId: ${customerId}`);

      if (userId) {
        try {
          if (subscriptionType === 'ads') {
            const sub = await this.prisma.adsSubscription.upsert({
              where: { userId },
              create: {
                userId,
                stripeCustomerId: customerId,
                stripeSubscriptionId: subscriptionId,
                status: 'active',
                amount: 20.0,
              },
              update: {
                stripeCustomerId: customerId,
                stripeSubscriptionId: subscriptionId,
                status: 'active',
              },
              include: { user: true },
            });
            this.logger.log(`Ads Subscription updated for user ${userId}: active`);
            await this.mailService.sendSubscriptionEmail(sub.user.email, sub.user.firstName, 'started');
          } else {
            const amount = plan === 'yearly' ? 50.0 : 5.0;
            const sub = await this.prisma.subscription.upsert({
              where: { userId },
              create: {
                userId,
                stripeCustomerId: customerId,
                stripeSubscriptionId: subscriptionId,
                status: 'active',
                amount,
              },
              update: {
                stripeCustomerId: customerId,
                stripeSubscriptionId: subscriptionId,
                status: 'active',
                amount,
              },
              include: { user: true },
            });
            this.logger.log(`Normal Subscription updated for user ${userId}: active`);
            await this.mailService.sendSubscriptionEmail(sub.user.email, sub.user.firstName, 'started');
          }
        } catch (dbError: any) {
          this.logger.error(`Database error in handleCheckoutSessionCompleted: ${dbError.message}`);
          throw dbError;
        }
      } else {
        this.logger.warn(`No userId found in session metadata for session ${session.id}`);
        // Fallback search by customerId
        const existingSub = await this.prisma.subscription.findUnique({ where: { stripeCustomerId: customerId } });
        if (existingSub) {
          await this.prisma.subscription.update({
            where: { id: existingSub.id },
            data: { stripeSubscriptionId: subscriptionId, status: 'active' },
          });
        } else {
          const existingAdsSub = await this.prisma.adsSubscription.findUnique({ where: { stripeCustomerId: customerId } });
          if (existingAdsSub) {
            await this.prisma.adsSubscription.update({
              where: { id: existingAdsSub.id },
              data: { stripeSubscriptionId: subscriptionId, status: 'active' },
            });
          }
        }
      }
    }
  }

  private async handleSubscriptionUpdated(subscription: any) {
    const customerId = subscription.customer as string;
    this.logger.log(`Handling subscription event for customer: ${customerId}, status: ${subscription.status}`);
    
    // Check both tables
    const existingSub = await this.prisma.subscription.findUnique({
      where: { stripeCustomerId: customerId },
      include: { user: true },
    });

    if (existingSub) {
      await this.updateSubscriptionRecord('normal', existingSub, subscription);
      return;
    }

    const existingAdsSub = await this.prisma.adsSubscription.findUnique({
      where: { stripeCustomerId: customerId },
      include: { user: true },
    });

    if (existingAdsSub) {
      await this.updateSubscriptionRecord('ads', existingAdsSub, subscription);
      return;
    }

    this.logger.warn(`No subscription record found for customerId: ${customerId}`);
  }

  private async updateSubscriptionRecord(type: 'normal' | 'ads', existingRecord: any, subscription: any) {
    const isNewlyCanceled = subscription.status === 'canceled' && existingRecord.status !== 'canceled';
    const isNewlyCancelingSoon = subscription.cancel_at_period_end && !existingRecord.cancelAtPeriodEnd;

    const updateData = {
      stripeSubscriptionId: subscription.id,
      status: subscription.status as any,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
    };

    if (type === 'normal') {
      await this.prisma.subscription.update({ where: { id: existingRecord.id }, data: updateData });
    } else {
      await this.prisma.adsSubscription.update({ where: { id: existingRecord.id }, data: updateData });
    }

    this.logger.log(`${type === 'ads' ? 'Ads' : 'Normal'} Subscription ${subscription.id} updated in DB. Status: ${subscription.status}`);

    if (isNewlyCanceled) {
      await this.mailService.sendSubscriptionEmail(existingRecord.user.email, existingRecord.user.firstName, 'canceled');
    } else if (isNewlyCancelingSoon) {
      await this.mailService.sendSubscriptionEmail(existingRecord.user.email, existingRecord.user.firstName, 'canceling_soon');
    }
  }

  private async handleInvoicePaymentSucceeded(invoice: any) {
    if (invoice.subscription) {
      const customerId = invoice.customer as string;
      const sub = await this.prisma.subscription.findUnique({
        where: { stripeCustomerId: customerId },
        include: { user: true },
      });

      if (sub) {
        await this.prisma.paymentHistory.create({
          data: {
            userId: sub.userId,
            subscriptionId: sub.id,
            stripeInvoiceId: invoice.id,
            stripePaymentIntentId: invoice.payment_intent as string,
            amountPaid: invoice.amount_paid / 100,
            amountDue: invoice.amount_due / 100,
            currency: invoice.currency,
            status: 'succeeded',
            invoiceUrl: invoice.hosted_invoice_url,
            invoicePdf: invoice.invoice_pdf,
            paidAt: new Date(invoice.created * 1000),
            billingReason: invoice.billing_reason,
          },
        });

        this.logger.log(`Payment history created for user ${sub.userId}, invoice ${invoice.id}`);

        if (invoice.billing_reason === 'subscription_cycle') {
          await this.mailService.sendSubscriptionEmail(
            sub.user.email,
            sub.user.firstName,
            'succeeded',
            {
              amount: invoice.amount_paid / 100,
              invoiceUrl: invoice.hosted_invoice_url,
            },
          );
        }
      }
    }
  }

  private async handleInvoicePaymentFailed(invoice: any) {
    if (invoice.subscription) {
      const customerId = invoice.customer as string;
      const sub = await this.prisma.subscription.findUnique({
        where: { stripeCustomerId: customerId },
        include: { user: true },
      });

      if (sub) {
        await this.prisma.paymentHistory.create({
          data: {
            userId: sub.userId,
            subscriptionId: sub.id,
            stripeInvoiceId: invoice.id,
            stripePaymentIntentId: invoice.payment_intent as string,
            amountPaid: 0,
            amountDue: invoice.amount_due / 100,
            currency: invoice.currency,
            status: 'failed',
            invoiceUrl: invoice.hosted_invoice_url,
            invoicePdf: invoice.invoice_pdf,
            billingReason: invoice.billing_reason,
          },
        });

        this.logger.warn(`Payment failed for user ${sub.userId}, invoice ${invoice.id}`);

        await this.mailService.sendSubscriptionEmail(
          sub.user.email,
          sub.user.firstName,
          'failed',
          { invoiceUrl: invoice.hosted_invoice_url },
        );
      }
    }
  }
}
