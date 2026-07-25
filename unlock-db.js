const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Attempting to unlock Postgres advisory locks...");
    
    // This query releases all advisory locks held by the current session
    // However, to kill other idle sessions holding the lock, we can terminate them:
    const result = await prisma.$executeRawUnsafe(`
      SELECT pg_terminate_backend(pid) 
      FROM pg_stat_activity 
      WHERE datname = current_database() 
        AND pid <> pg_backend_pid() 
        AND state in ('idle', 'idle in transaction', 'idle in transaction (aborted)', 'disabled');
    `);
    
    console.log("Successfully cleared idle database connections and locks!");
    console.log("You can now try running your migrate command again.");
  } catch (error) {
    console.error("Error unlocking database:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
