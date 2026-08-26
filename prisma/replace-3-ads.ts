import { PrismaClient, AdStatus } from '@prisma/client';
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

const top3Ads = [
  {
    companyName: 'Happy Pups Pet Care',
    title: 'Taylor J. - Dog Walker & Pet Care Specialist',
    description:
      "Loving Care. Safe Walks. Happy Dogs. Reliable, attentive, and fun walks tailored to your dog's needs. You can count on me!",
    image: '/ads/ChatGPT Image Aug 25_ 2026_ 11_38_01 AM.png',
    youtubeLink: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    location: 'Los Angeles, CA',
  },
  {
    companyName: 'Clean & Precise Painting Co.',
    title: 'Tyler S. - Professional Painter',
    description:
      "Reliable. Clean. Detail-Oriented. Every Time. High-quality interior and exterior painting with attention to detail. Let's bring your vision to life!",
    image: '/ads/ChatGPT Image Aug 25_ 2026_ 11_31_47 AM.png',
    youtubeLink: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    location: 'Los Angeles, CA',
  },
  {
    companyName: 'Mike D. Plumbing Services',
    title: 'Mike D. - Professional Plumber',
    description:
      'Licensed. Experienced. Reliable. Honest pricing, quality workmanship, and fast, reliable service for all your plumbing needs.',
    image: '/ads/ChatGPT Image Aug 25_ 2026_ 11_22_28 AM.png',
    youtubeLink: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    location: 'Los Angeles, CA',
  },
];

async function main() {
  console.log('Replacing top 3 ads in the database so they appear FIRST...');

  let user = await prisma.user.findFirst({
    where: { role: 'admin' },
  });
  if (!user) {
    user = await prisma.user.findFirst();
  }

  if (!user) {
    console.error('No user found to associate with ads.');
    process.exit(1);
  }

  const categories = await prisma.adCategory.findMany();
  const defaultCategoryId = categories[0]?.id;

  const now = Date.now();

  for (let i = 0; i < top3Ads.length; i++) {
    const adData = top3Ads[i];
    const adCreatedAt = new Date(now + (top3Ads.length - i) * 1000);

    const existingAd = await prisma.ad.findFirst({
      where: {
        OR: [
          { companyName: adData.companyName },
          { title: adData.title }
        ]
      }
    });

    if (existingAd) {
      console.log(`Updating ad "${adData.companyName}" (${existingAd.id}) to be at position #${i + 1}...`);
      await prisma.ad.update({
        where: { id: existingAd.id },
        data: {
          companyName: adData.companyName,
          title: adData.title,
          description: adData.description,
          imageUrl: adData.image,
          youtubeLink: adData.youtubeLink,
          location: adData.location,
          status: AdStatus.active,
          createdAt: adCreatedAt,
        },
      });
    } else {
      console.log(`Creating ad "${adData.companyName}" at position #${i + 1}...`);
      await prisma.ad.create({
        data: {
          userId: user.id,
          companyName: adData.companyName,
          title: adData.title,
          description: adData.description,
          imageUrl: adData.image,
          youtubeLink: adData.youtubeLink,
          location: adData.location,
          categoryId: defaultCategoryId,
          status: AdStatus.active,
          createdAt: adCreatedAt,
        },
      });
    }
  }

  console.log('Successfully set top 3 ads at the VERY TOP of the gallery!');
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
