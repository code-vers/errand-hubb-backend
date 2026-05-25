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
    const pool = new Pool({
      connectionString: config.DATABASE_URL,
      ssl: config.DATABASE_SSL ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
    const adapter = new PrismaPg(pool);

    // Standard Prisma 7 inheritance with Driver Adapter
    super({ adapter });
  }

  async onModuleInit() {
    try {
      await (this as any).$connect();
      console.log('Prisma connected successfully');
    } catch (error) {
      console.error('Prisma connection error:', error);
      console.error(
        'FATAL: Could not connect to the database. Stopping server...',
      );
      process.exit(1);
    }
  }

  async onModuleDestroy() {
    await (this as any).$disconnect();
  }
}
