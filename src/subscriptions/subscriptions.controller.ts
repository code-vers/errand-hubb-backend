import {
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
  Query,
  Param,
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('create-checkout-session')
  createCheckoutSession(@Request() req: any) {
    return this.subscriptionsService.createCheckoutSession(
      req.user.id || req.user.sub,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMySubscription(@Request() req: any) {
    return this.subscriptionsService.getMySubscription(
      req.user.id || req.user.sub,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('cancel')
  cancelSubscription(@Request() req: any) {
    return this.subscriptionsService.cancelSubscription(
      req.user.id || req.user.sub,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('customer-portal')
  createCustomerPortal(@Request() req: any) {
    return this.subscriptionsService.createCustomerPortal(
      req.user.id || req.user.sub,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin/all')
  getAllSubscriptions(@Query() query: any, @Request() req: any) {
    // Ideally use RolesGuard here
    return this.subscriptionsService.getAllSubscriptions(query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin/all/:id')
  getSubscriptionDetails(@Param('id') id: string) {
    return this.subscriptionsService.getSubscriptionDetails(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin/payments')
  getAllPayments(@Query() query: any) {
    return this.subscriptionsService.getAllPayments(query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin/payments/:id')
  getPaymentDetails(@Param('id') id: string) {
    return this.subscriptionsService.getPaymentDetails(id);
  }
}
