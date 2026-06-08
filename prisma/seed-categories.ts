import { PrismaClient } from '../src/generated/prisma/client.js';
import { IconType } from '../src/generated/prisma/enums.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env vars
dotenv.config({ path: join(__dirname, '..', '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const categories = [
  { name: "Grocery Shopping", icon: "🛒", iconType: IconType.emoji, color: "#ec6f27", description: "Get your groceries delivered to your doorstep without any hassle." },
  { name: "Fast Delivery", icon: "📦", iconType: IconType.emoji, color: "#3b82f6", description: "Swift and secure delivery of your packages anywhere in the city." },
  { name: "Pharmacy Pickup", icon: "💊", iconType: IconType.emoji, color: "#ef4444", description: "We'll pick up your prescriptions and health essentials for you." },
  { name: "Laundry Services", icon: "🧺", iconType: IconType.emoji, color: "#8b5cf6", description: "Professional laundry pickup and delivery at your convenience." },
  { name: "Personal Transport", icon: "🚗", iconType: IconType.emoji, color: "#10b981", description: "Safe and reliable transport for you or your important items." },
  { name: "Pet Care", icon: "🐾", iconType: IconType.emoji, color: "#ec4899", description: "Walking, feeding, and caring for your furry friends." },
  { name: "Document Handling", icon: "📄", iconType: IconType.emoji, color: "#6b7280", description: "Safe transport and filing of your important documents." },
  { name: "Food Pickup", icon: "🍔", iconType: IconType.emoji, color: "#f59e0b", description: "Your favorite meals from any restaurant delivered hot." },
  { name: "Handyman Help", icon: "🧰", iconType: IconType.emoji, color: "#063b5c", description: "Expert help for small repairs and home maintenance tasks." },
  { name: "Personal Shopping", icon: "🛍️", iconType: IconType.emoji, color: "#ec6f27", description: "Someone to do your shopping and finding the best deals." },
  { name: "Wait in Line", icon: "🧍", iconType: IconType.emoji, color: "#3b82f6", description: "We'll wait in line for you at the DMV, concerts, or any event." },
  { name: "Mail & Post", icon: "📮", iconType: IconType.emoji, color: "#22c55e", description: "Handling your mail, stamps, and post office errands." },
];

async function main() {
  console.log('Start seeding categories...');
  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: category,
      create: category,
    });
  }
  console.log('Seeding finished.');
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
