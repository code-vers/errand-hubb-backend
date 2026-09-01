import {
  Controller,
  Post,
  Headers,
  Req,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiBody,
} from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service.js';
import Stripe from 'stripe';
import { config } from '../config/config.js';
import { Request } from 'express';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  private stripe: Stripe;
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly webhooksService: WebhooksService) {
    this.stripe = new Stripe(config.STRIPE_SECRET_KEY || 'sk_test_mock', {
      apiVersion: '2024-12-18.acacia' as any,
    });
  }

  @Post('stripe')
  @ApiOperation({ summary: 'Stripe Webhook Event Receiver (Verifies stripe-signature against raw request body)' })
  @ApiHeader({ name: 'stripe-signature', required: true, description: 'Stripe cryptographic webhook signature header' })
  @ApiBody({
    schema: {
      type: 'object',
      description: 'Stripe raw JSON event payload',
      properties: {
        id: { type: 'string', example: 'evt_123456789' },
        type: { type: 'string', example: 'checkout.session.completed' },
        data: { type: 'object' },
      },
    },
  })
  @ApiResponse({ status: 200, description: '{ received: true }' })
  @ApiResponse({ status: 400, description: 'Missing signature or invalid raw body' })
  async handleStripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: any,
  ) {
    if (!signature) {
      this.logger.error('Missing stripe-signature header');
      throw new BadRequestException('Missing stripe-signature header');
    }

    const rawRequest = req as RawBodyRequest<Request>;

    if (!rawRequest.rawBody) {
      this.logger.error('Raw body not found. Ensure rawBody: true is set in NestFactory.create()');
      throw new BadRequestException('Raw body not found');
    }

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        rawRequest.rawBody,
        signature,
        config.STRIPE_WEBHOOK_SECRET,
      );
    } catch (err: any) {
      this.logger.error(`Webhook Signature Verification Failed: ${err.message}`);
      throw new BadRequestException('Webhook Error: ' + err.message);
    }

    this.logger.log(`Webhook Verified: ${event.type} (${event.id})`);
    return this.webhooksService.handleStripeEvent(event);
  }
}
