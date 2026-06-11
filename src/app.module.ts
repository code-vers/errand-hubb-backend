import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { PostsModule } from './posts/posts.module.js';
import { CategoriesModule } from './categories/categories.module.js';
import { UsersModule } from './users/users.module.js';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { ThrottlerModule } from '@nestjs/throttler';
import { MailModule } from './mail/mail.module.js';
import { SubscriptionsModule } from './subscriptions/subscriptions.module.js';
import { WebhooksModule } from './webhooks/webhooks.module.js';
import { MessagesModule } from './messages/messages.module.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
    ThrottlerModule.forRoot([{
      name: 'short',
      ttl: 60000, // 1 minute
      limit: 100, // Increased default
    }, {
      name: 'medium',
      ttl: 900000, // 15 minutes
      limit: 1000, // Increased default
    }]),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'media'),
      serveRoot: '/media',
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
  ],
})
export class AppModule {}
