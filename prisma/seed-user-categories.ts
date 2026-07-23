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

const categoriesList = [
  "Home Services",
  "Plumbing", "Electrical", "HVAC / Heating & Air Conditioning", "Appliance Repair", "Handyman Services", "Locksmith", "Pest Control", "Roofing", "Flooring", "Painting", "Drywall Repair", "Window Installation & Repair", "Pressure Washing", "Gutter Cleaning", "Insulation",
  "Cleaning Services",
  "House Cleaning", "Deep Cleaning", "Move-In / Move-Out Cleaning", "Carpet Cleaning", "Window Cleaning", "Office Cleaning", "Junk Removal",
  "Construction & Renovation",
  "Remodeling", "General Contracting", "Kitchen Remodeling", "Bathroom Remodeling", "Concrete Work", "Framing", "Masonry", "Fence Installation", "Deck Building",
  "Lawn & Outdoor Services",
  "Landscaping", "Lawn Care", "Tree Trimming", "Gardening", "Sprinkler Repair", "Pool Cleaning", "Snow Removal",
  "Moving & Transportation",
  "Movers", "Packing Services", "Furniture Assembly", "Hauling", "Delivery Services", "Towing",
  "Automotive Services",
  "Auto Repair", "Car Detailing", "Mobile Mechanic", "Tire Services", "Oil Change", "Car Wash",
  "Health & Beauty",
  "Hair Stylist", "Barber", "Makeup Artist", "Nail Technician", "Massage Therapy", "Personal Trainer",
  "Business Services",
  "Accounting / Bookkeeping", "Tax Preparation", "Legal Services", "Notary Public", "Marketing Services", "Graphic Design", "Printing Services", "Virtual Assistant",
  "Tech Services",
  "Computer Repair", "Phone Repair", "IT Support", "Wi-Fi Setup", "Website Design", "App Development", "Cybersecurity",
  "Education & Lessons",
  "Tutoring", "Music Lessons", "Language Lessons", "Test Prep", "Driving Lessons",
  "Event Services",
  "Catering", "DJ Services", "Photography", "Videography", "Event Planning", "Party Rentals", "Security Services",
  "Pet Services",
  "Dog Walking", "Pet Sitting", "Grooming", "Pet Training", "Veterinary Services",
  "Family & Personal Care",
  "Babysitting", "Elder Care", "Companion Care", "House Sitting",
  "Shopping & Errands",
  "Grocery Delivery", "Personal Shopping", "Prescription Pickup", "Courier Services", "Food Delivery",
  "Specialty Services",
  "Private Investigator", "Security Guard Services", "Personal Assistant", "Concierge Services", "Custom Requests / Other"
];

async function main() {
  console.log('Start seeding new categories...');
  
  for (const name of categoriesList) {
    await prisma.category.upsert({
      where: { name: name },
      update: { status: 'active' },
      create: {
        name: name,
        icon: '📌',
        color: '#3b82f6',
        description: `Find or offer ${name} services.`
      },
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
