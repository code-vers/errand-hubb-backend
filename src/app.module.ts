import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { PostsModule } from './posts/posts.module.js';
import { CategoriesModule } from './categories/categories.module.js';
import { UsersModule } from './users/users.module.js';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerModule } from '@nestjs/throttler';
import { MailModule } from './mail/mail.module.js';
import { SubscriptionsModule } from './subscriptions/subscriptions.module.js';
import { WebhooksModule } from './webhooks/webhooks.module.js';
import { MessagesModule } from './messages/messages.module.js';
import { AdsModule } from './ads/ads.module.js';
import { AdsSubscriptionsModule } from './ads-subscriptions/ads-subscriptions.module.js';
import { config } from './config/config.js';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    PostsModule,
    CategoriesModule,
    UsersModule,
    MailModule,
    SubscriptionsModule,
    WebhooksModule,
    MessagesModule,
    AdsModule,
    AdsSubscriptionsModule,
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 60000, // 1 minute
        limit: 100, // Increased default
      },
      {
        name: 'medium',
        ttl: 900000, // 15 minutes
        limit: 1000, // Increased default
      },
    ]),
    ServeStaticModule.forRoot({
      rootPath: config.MEDIA_ROOT,
      serveRoot: '/media',
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
