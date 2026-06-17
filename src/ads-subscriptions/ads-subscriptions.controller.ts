import {
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AdsSubscriptionsService } from './ads-subscriptions.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@Controller('ads-subscriptions')
export class AdsSubscriptionsController {
  constructor(private readonly adsSubscriptionsService: AdsSubscriptionsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('create-checkout-session')
  createCheckoutSession(@Request() req: any) {
    return this.adsSubscriptionsService.createCheckoutSession(
      req.user.id || req.user.sub,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMySubscription(@Request() req: any) {
    return this.adsSubscriptionsService.getMySubscription(
      req.user.id || req.user.sub,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('cancel')
  cancelSubscription(@Request() req: any) {
    return this.adsSubscriptionsService.cancelSubscription(
      req.user.id || req.user.sub,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('customer-portal')
  createCustomerPortal(@Request() req: any) {
    return this.adsSubscriptionsService.createCustomerPortal(
      req.user.id || req.user.sub,
    );
  }
}
