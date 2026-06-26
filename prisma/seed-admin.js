import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env vars
dotenv.config({ path: join(__dirname, '..', '.env') });

const getSafeEnv = (key) => {
  if (process.env[key]) return process.env[key];
  const foundKey = Object.keys(process.env).find((k) => k.trim() === key);
  return foundKey ? process.env[foundKey] : '';
};

let databaseUrl = getSafeEnv('DATABASE_URL');
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not defined in environment variables');
}

const isNeon = databaseUrl.includes('neon.tech');
if (isNeon && databaseUrl.includes('channel_binding=')) {
  databaseUrl = databaseUrl.replace(/&?channel_binding=[^&]*/, '');
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: isNeon || process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: isNeon ? 10 : 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  console.error('DATABASE: Unexpected error on idle client', err);
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
      role: 'admin',
      status: 'active',
    },
    create: {
      firstName: 'System',
      lastName: 'Admin',
      email: adminEmail,
      password: hashedPassword,
      role: 'admin',
      status: 'active',
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
