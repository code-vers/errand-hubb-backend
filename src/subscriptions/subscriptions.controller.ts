import {
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
  Query,
  Param,
  Body,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@ApiTags('Subscriptions')
@ApiBearerAuth('JWT-auth')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('create-checkout-session')
  @ApiOperation({ summary: 'Create Stripe checkout session for Errander membership subscription' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        plan: { type: 'string', enum: ['monthly', 'yearly'], default: 'monthly', example: 'monthly' },
      },
    },
  })
  @ApiResponse({ status: 200, description: '{ url: string } - Stripe checkout session URL' })
  createCheckoutSession(
    @Request() req: any,
    @Body() body: { plan?: 'monthly' | 'yearly' },
  ) {
    return this.subscriptionsService.createCheckoutSession(
      req.user.id || req.user.sub,
      body?.plan || 'monthly',
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'Get current user active membership subscription' })
  @ApiResponse({ status: 200, description: 'Active membership details' })
  getMySubscription(@Request() req: any) {
    return this.subscriptionsService.getMySubscription(
      req.user.id || req.user.sub,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('cancel')
  @ApiOperation({ summary: 'Cancel current user membership subscription' })
  @ApiResponse({ status: 200, description: 'Membership cancelled' })
  cancelSubscription(@Request() req: any) {
    return this.subscriptionsService.cancelSubscription(
      req.user.id || req.user.sub,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('customer-portal')
  @ApiOperation({ summary: 'Create Stripe customer billing portal session link' })
  @ApiResponse({ status: 200, description: '{ url: string } - Billing portal URL' })
  createCustomerPortal(@Request() req: any) {
    return this.subscriptionsService.createCustomerPortal(
      req.user.id || req.user.sub,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin/all')
  @ApiOperation({ summary: '[Admin] Get list of all platform user memberships' })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Memberships listing' })
  getAllSubscriptions(@Query() query: any, @Request() req: any) {
    return this.subscriptionsService.getAllSubscriptions(query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin/all/:id')
  @ApiOperation({ summary: '[Admin] Get single membership details' })
  @ApiParam({ name: 'id', description: 'Subscription UUID' })
  @ApiResponse({ status: 200, description: 'Subscription details' })
  getSubscriptionDetails(@Param('id') id: string) {
    return this.subscriptionsService.getSubscriptionDetails(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin/payments')
  @ApiOperation({ summary: '[Admin] Get all payment invoice transactions' })
  @ApiQuery({ name: 'page', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Payments listing' })
  getAllPayments(@Query() query: any) {
    return this.subscriptionsService.getAllPayments(query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin/payments/:id')
  @ApiOperation({ summary: '[Admin] Get single payment transaction details' })
  @ApiParam({ name: 'id', description: 'Payment record ID' })
  @ApiResponse({ status: 200, description: 'Payment details' })
  getPaymentDetails(@Param('id') id: string) {
    return this.subscriptionsService.getPaymentDetails(id);
  }
}
