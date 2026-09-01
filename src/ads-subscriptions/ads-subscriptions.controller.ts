import {
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AdsSubscriptionsService } from './ads-subscriptions.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@ApiTags('Ads Subscriptions')
@ApiBearerAuth('JWT-auth')
@Controller('ads-subscriptions')
export class AdsSubscriptionsController {
  constructor(private readonly adsSubscriptionsService: AdsSubscriptionsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('create-checkout-session')
  @ApiOperation({ summary: 'Create Stripe checkout session for advertisement subscription' })
  @ApiResponse({ status: 200, description: '{ url: string } - Stripe hosted checkout URL' })
  createCheckoutSession(@Request() req: any) {
    return this.adsSubscriptionsService.createCheckoutSession(
      req.user.id || req.user.sub,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'Get current user active advertisement subscription' })
  @ApiResponse({ status: 200, description: 'Active ad subscription details' })
  getMySubscription(@Request() req: any) {
    return this.adsSubscriptionsService.getMySubscription(
      req.user.id || req.user.sub,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('cancel')
  @ApiOperation({ summary: 'Cancel current user advertisement subscription' })
  @ApiResponse({ status: 200, description: 'Ad subscription cancelled' })
  cancelSubscription(@Request() req: any) {
    return this.adsSubscriptionsService.cancelSubscription(
      req.user.id || req.user.sub,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('customer-portal')
  @ApiOperation({ summary: 'Create Stripe customer billing portal session link' })
  @ApiResponse({ status: 200, description: '{ url: string } - Billing portal URL' })
  createCustomerPortal(@Request() req: any) {
    return this.adsSubscriptionsService.createCustomerPortal(
      req.user.id || req.user.sub,
    );
  }
}
