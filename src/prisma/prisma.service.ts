/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { config } from '../config/config.js';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const isNeon = config.DATABASE_URL?.includes('neon.tech');
    const isPooler = config.DATABASE_URL?.includes('-pooler');

    if (isNeon && !isPooler) {
      console.warn(
        'ADVISORY: You are connecting to Neon directly. For Vercel/Production, the "-pooler" endpoint is highly recommended.',
      );
    }

    // Prepare connection string - strip channel_binding if it causes issues
    let connectionString = config.DATABASE_URL;
    if (isNeon && connectionString.includes('channel_binding=')) {
      connectionString = connectionString.replace(
        /&?channel_binding=[^&]*/,
        '',
      );
    }

    const pool = new Pool({
      connectionString: connectionString,
      ssl:
        config.DATABASE_SSL || isNeon ? { rejectUnauthorized: false } : false,
      max: isNeon ? 10 : 20, // Lower max for Neon free tier
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 30000, // 30s timeout for better reliability
    });

    pool.on('error', (err) => {
      console.error('DATABASE: Unexpected error on idle client', err);
    });

    const adapter = new PrismaPg(pool);

    // Standard Prisma 7 inheritance with Driver Adapter
    super({ adapter });
  }

  async onModuleInit() {
    try {
      console.log('Prisma: Attempting to connect...');
      await (this as any).$connect();
      console.log('Prisma: Connected successfully');

      // Clean duplicate conversations
      await this.cleanDuplicateConversations();

      // Create partial unique index to prevent duplicate conversations at DB-level
      console.log('Prisma: Creating partial unique index if not exists...');
      await (this as any).$executeRawUnsafe(
        `CREATE UNIQUE INDEX IF NOT EXISTS unique_client_errand_no_service_request ON conversations (client_id, errand_id) WHERE service_request_id IS NULL;`
      );
      console.log('Prisma: Partial unique index checked/created successfully');
    } catch (error: any) {
      console.error('Prisma: Connection or setup failed');
      console.error('Error Detail:', error.message);

      if (error.message.includes('ETIMEDOUT')) {
        console.error(
          'DIAGNOSIS: Database connection timed out. Check your internet or Neon IP Allowlist.',
        );
      }
    }
  }

  async cleanDuplicateConversations() {
    try {
      console.log('Prisma: Checking for duplicate conversations to clean up...');
      // 1. Find all conversations with serviceRequestId = null
      const conversations = await (this as any).conversation.findMany({
        where: { serviceRequestId: null },
        orderBy: { createdAt: 'asc' }, // Keep the oldest first
      });

      const groups = new Map<string, any[]>();
      for (const conv of conversations) {
        const key = `${conv.clientId}_${conv.errandId}`;
        let list = groups.get(key);
        if (!list) {
          list = [];
          groups.set(key, list);
        }
        list.push(conv);
      }

      for (const [key, convs] of groups.entries()) {
        if (convs.length > 1) {
          const keepConv = convs[0];
          const duplicates = convs.slice(1);
          console.log(`Prisma: Found ${duplicates.length} duplicate conversation(s) for client/errand pair ${key}. Keeping conversation ${keepConv.id}`);

          for (const dup of duplicates) {
            // Re-link any messages from duplicate to keepConv
            await (this as any).message.updateMany({
              where: { conversationId: dup.id },
              data: { conversationId: keepConv.id },
            });
            // Delete duplicate conversation
            await (this as any).conversation.delete({
              where: { id: dup.id },
            });
          }
        }
      }
      console.log('Prisma: Duplicate conversation cleanup completed successfully');
    } catch (err: any) {
      console.error('Prisma: Error during duplicate conversation cleanup:', err.message);
    }
  }

  async onModuleDestroy() {
    await (this as any).$disconnect();
  }
}
