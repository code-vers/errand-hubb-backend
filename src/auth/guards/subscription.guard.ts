import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // populated by JwtAuthGuard

    if (!user) return false;

    // Clients don't need a subscription, only errands do according to rules
    if (user.role !== 'errand') {
      return true;
    }

    const subscription = await this.prisma.subscription.findUnique({
      where: { userId: user.id || user.sub },
    });

    if (!subscription) {
      throw new ForbiddenException('SUBSCRIPTION_REQUIRED');
    }

    const activeStatuses = ['active', 'trialing'];
    if (!activeStatuses.includes(subscription.status)) {
      throw new ForbiddenException('SUBSCRIPTION_REQUIRED');
    }

    return true;
  }
}
