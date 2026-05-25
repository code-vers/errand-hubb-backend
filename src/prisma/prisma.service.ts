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
    const pool = new Pool({ connectionString: config.DATABASE_URL });
    const adapter = new PrismaPg(pool);

    // In Prisma 7, we pass the adapter to the constructor.
    // The 'datasources' property is no longer used for direct connection strings.
    super({ adapter });
  }

  async onModuleInit() {
    await (this as any).$connect();
  }

  async onModuleDestroy() {
    await (this as any).$disconnect();
  }
}
