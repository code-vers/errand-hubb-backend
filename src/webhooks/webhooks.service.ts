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
    try {
      const existingEvent = await this.prisma.webhookEvent.findUnique({
        where: { stripeEventId: event.id },
      });

      if (existingEvent) {
        this.logger.log('Event already processed. Skipping.');
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

      return { received: true };
    } catch (error: any) {
      this.logger.error('Error processing webhook:', error);
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
    if (session.mode === 'subscription' && session.subscription) {
      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;
      const userId = session.subscription_data?.metadata?.userId;

      if (userId) {
        const sub = await this.prisma.subscription.upsert({
          where: { userId },
          create: {
            userId,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            status: 'active',
            amount: 5.0,
          },
          update: {
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            status: 'active',
          },
          include: { user: true },
        });

        await this.mailService.sendSubscriptionEmail(
          sub.user.email,
          sub.user.firstName,
          'started',
        );
      }
    }
  }

  private async handleSubscriptionUpdated(subscription: any) {
    const customerId = subscription.customer as string;
    const existingSub = await this.prisma.subscription.findUnique({
      where: { stripeCustomerId: customerId },
      include: { user: true },
    });

    if (existingSub) {
      const isNewlyCanceled =
        subscription.status === 'canceled' && existingSub.status !== 'canceled';
      const isNewlyCancelingSoon =
        subscription.cancel_at_period_end && !existingSub.cancelAtPeriodEnd;

      await this.prisma.subscription.update({
        where: { id: existingSub.id },
        data: {
          stripeSubscriptionId: subscription.id,
          status: subscription.status as any,
          currentPeriodStart: new Date(
            subscription.current_period_start * 1000,
          ),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          canceledAt: subscription.canceled_at
            ? new Date(subscription.canceled_at * 1000)
            : null,
        },
      });

      if (isNewlyCanceled) {
        await this.mailService.sendSubscriptionEmail(
          existingSub.user.email,
          existingSub.user.firstName,
          'canceled',
        );
      } else if (isNewlyCancelingSoon) {
        await this.mailService.sendSubscriptionEmail(
          existingSub.user.email,
          existingSub.user.firstName,
          'canceling_soon',
        );
      }
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
