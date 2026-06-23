import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Starting duplicate conversation cleanup script...');

  const conversations = await prisma.conversation.findMany({
    where: { serviceRequestId: null },
    orderBy: { createdAt: 'asc' },
  });

  const groups = new Map<string, any[]>();
  for (const conv of conversations) {
    const key = `${conv.clientId}_${conv.errandId}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(conv);
  }

  for (const [key, convs] of groups.entries()) {
    if (convs.length > 1) {
      const keepConv = convs[0];
      const duplicates = convs.slice(1);
      console.log(`Found ${duplicates.length} duplicate(s) for client/errand ${key}. Keeping conversation ${keepConv.id}`);

      for (const dup of duplicates) {
        // Re-link messages
        await prisma.message.updateMany({
          where: { conversationId: dup.id },
          data: { conversationId: keepConv.id },
        });
        // Delete duplicate conversation
        await prisma.conversation.delete({
          where: { id: dup.id },
        });
      }
    }
  }

  // Create partial unique index
  console.log('Ensuring partial unique index in DB...');
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS unique_client_errand_no_service_request ON conversations (client_id, errand_id) WHERE service_request_id IS NULL;`
  );

  console.log('Cleanup script finished successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
