import { PrismaClient } from '../src/generated/prisma/client.js';
import { UserRole, UserStatus } from '../src/generated/prisma/enums.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as bcrypt from 'bcrypt';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env vars
dotenv.config({ path: join(__dirname, '..', '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Start seeding admin user...');
  
  const adminEmail = 'admin@gmail.com';
  const adminPassword = 'admin@123';
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      password: hashedPassword,
      role: UserRole.admin,
      status: UserStatus.active,
    },
    create: {
      firstName: 'System',
      lastName: 'Admin',
      email: adminEmail,
      password: hashedPassword,
      role: UserRole.admin,
      status: UserStatus.active,
      profile: {
        create: {
          bio: 'System Administrator',
        },
      },
    },
  });

  console.log('Admin user seeded/updated successfully.');
  console.log(`Email: ${adminEmail}`);
  console.log(`Password: ${adminPassword}`);
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
