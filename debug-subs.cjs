const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const subs = await prisma.subscription.findMany({
    select: {
      userId: true,
      amount: true,
      planName: true,
      status: true,
    }
  });
  console.dir(subs, { depth: null });
}
main().catch(console.error).finally(() => prisma.$disconnect());
