import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class AdsSubscriptionGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) return false;

    // Admin can always post ads
    if (user.role === 'admin') return true;

    const subscription = await this.prisma.adsSubscription.findUnique({
      where: { userId: user.id || user.sub },
    });

    if (!subscription) {
      throw new ForbiddenException('ADS_SUBSCRIPTION_REQUIRED');
    }

    const activeStatuses = ['active', 'trialing'];
    if (!activeStatuses.includes(subscription.status)) {
      throw new ForbiddenException('ADS_SUBSCRIPTION_REQUIRED');
    }

    return true;
  }
}
