import {
  Controller,
  Post,
  Headers,
  Req,
  BadRequestException,
  RawBodyRequest,
} from '@nestjs/common';
import { WebhooksService } from './webhooks.service.js';
import Stripe from 'stripe';
import { config } from '../config/config.js';

@Controller('webhooks')
export class WebhooksController {
  private stripe: Stripe;

  constructor(private readonly webhooksService: WebhooksService) {
    this.stripe = new Stripe(config.STRIPE_SECRET_KEY || 'sk_test_mock', {
      apiVersion: '2024-12-18.acacia' as any,
    });
  }

  @Post('stripe')
  async handleStripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: any,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        req.rawBody,
        signature,
        config.STRIPE_WEBHOOK_SECRET,
      );
    } catch (err: any) {
      throw new BadRequestException('Webhook Error: ' + err.message);
    }

    return this.webhooksService.handleStripeEvent(event);
  }
}
