/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { config } from '../config/config.js';
import { PrismaClient } from '../generated/prisma/client.js';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const isNeon = config.DATABASE_URL?.includes('neon.tech');
    const isPooler = config.DATABASE_URL?.includes('-pooler');

    if (isNeon && !isPooler) {
      console.warn('ADVISORY: You are connecting to Neon directly. For Vercel/Production, the "-pooler" endpoint is highly recommended.');
    }

    // Prepare connection string - strip channel_binding if it causes issues
    let connectionString = config.DATABASE_URL;
    if (isNeon && connectionString.includes('channel_binding=')) {
      connectionString = connectionString.replace(/&?channel_binding=[^&]*/, '');
    }

    const pool = new Pool({
      connectionString: connectionString,
      ssl: (config.DATABASE_SSL || isNeon) ? { rejectUnauthorized: false } : false,
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
    } catch (error: any) {
      console.error('Prisma: Connection failed');
      console.error('Error Detail:', error.message);
      
      if (error.message.includes('ETIMEDOUT')) {
        console.error('DIAGNOSIS: Database connection timed out. Check your internet or Neon IP Allowlist.');
      }
    }
  }

  async onModuleDestroy() {
    await (this as any).$disconnect();
  }
}
