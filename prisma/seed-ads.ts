import { PrismaClient, AdStatus } from '@prisma/client';
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

const adsCategories = [
  {
    name: "Home Services",
    subcategories: [
      "Plumbing", "Electrical", "HVAC / Heating & Air Conditioning", "Appliance Repair",
      "Handyman Services", "Locksmith", "Pest Control", "Roofing", "Flooring", "Painting",
      "Drywall Repair", "Window Installation & Repair", "Pressure Washing", "Gutter Cleaning", "Insulation"
    ],
  },
  {
    name: "Cleaning Services",
    subcategories: [
      "House Cleaning", "Deep Cleaning", "Move-In / Move-Out Cleaning", "Carpet Cleaning",
      "Window Cleaning", "Office Cleaning", "Junk Removal"
    ],
  },
  {
    name: "Construction & Renovation",
    subcategories: [
      "Remodeling", "General Contracting", "Kitchen Remodeling", "Bathroom Remodeling",
      "Concrete Work", "Framing", "Masonry", "Fence Installation", "Deck Building"
    ],
  },
  {
    name: "Lawn & Outdoor Services",
    subcategories: [
      "Landscaping", "Lawn Care", "Tree Trimming", "Gardening", "Sprinkler Repair",
      "Pool Cleaning", "Snow Removal"
    ],
  },
  {
    name: "Moving & Transportation",
    subcategories: [
      "Movers", "Packing Services", "Furniture Assembly", "Hauling", "Delivery Services", "Towing"
    ],
  },
  {
    name: "Automotive Services",
    subcategories: [
      "Auto Repair", "Car Detailing", "Mobile Mechanic", "Tire Services", "Oil Change", "Car Wash"
    ],
  },
  {
    name: "Health & Beauty",
    subcategories: [
      "Hair Stylist", "Barber", "Makeup Artist", "Nail Technician", "Massage Therapy", "Personal Trainer"
    ],
  },
  {
    name: "Business Services",
    subcategories: [
      "Accounting / Bookkeeping", "Tax Preparation", "Legal Services", "Notary Public",
      "Marketing Services", "Graphic Design", "Printing Services", "Virtual Assistant"
    ],
  },
  {
    name: "Tech Services",
    subcategories: [
      "Computer Repair", "Phone Repair", "IT Support", "Wi-Fi Setup", "Website Design",
      "App Development", "Cybersecurity"
    ],
  },
  {
    name: "Education & Lessons",
    subcategories: [
      "Tutoring", "Music Lessons", "Language Lessons", "Test Prep", "Driving Lessons"
    ],
  },
  {
    name: "Event Services",
    subcategories: [
      "Catering", "DJ Services", "Photography", "Videography", "Event Planning",
      "Party Rentals", "Security Services"
    ],
  },
  {
    name: "Pet Services",
    subcategories: [
      "Dog Walking", "Pet Sitting", "Grooming", "Pet Training", "Veterinary Services"
    ],
  },
  {
    name: "Family & Personal Care",
    subcategories: [
      "Babysitting", "Elder Care", "Companion Care", "House Sitting"
    ],
  },
  {
    name: "Shopping & Errands",
    subcategories: [
      "Grocery Delivery", "Personal Shopping", "Prescription Pickup", "Courier Services", "Food Delivery"
    ],
  },
  {
    name: "Specialty Services",
    subcategories: [
      "Private Investigator", "Security Guard Services", "Personal Assistant",
      "Concierge Services", "Custom Requests / Other"
    ],
  },
];

const mockAds = [
  {
    companyName: "Fresh Grocery Co.",
    category: "Shopping & Errands",
    subcategory: "Grocery Delivery",
    image: "https://images.unsplash.com/photo-1704138031624-7aec2ed01304",
    youtubeLink: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    title: "Fresh Groceries Delivered Fast",
    description: "Quality groceries from local farms delivered right to your doorstep within 2 hours.",
    location: "New York, NY",
  },
  {
    companyName: "Tech Solutions Inc.",
    category: "Tech Services",
    subcategory: "IT Support",
    image: "https://images.unsplash.com/photo-1770581939371-326fc1537f10",
    title: "Expert Tech Support",
    description: "Remote and on-site IT support for businesses and homes. Fast resolution for all tech issues.",
    location: "San Francisco, CA",
  },
  {
    companyName: "Pet Care Professionals",
    category: "Pet Services",
    subcategory: "Pet Sitting",
    image: "https://images.unsplash.com/photo-1579677917230-8a938ffc0279",
    title: "Loving Care for Your Pets",
    description: "Professional pet sitting and walking services. We treat your pets like family.",
    location: "Austin, TX",
  },
  {
    companyName: "Swift Delivery",
    category: "Moving & Transportation",
    subcategory: "Delivery Services",
    image: "https://images.unsplash.com/photo-1602333869619-f05b7f19d3c9",
    title: "Safe & Secure Logistics",
    description: "Reliable delivery and moving services across the tri-state area. Safe handling guaranteed.",
    location: "Chicago, IL",
  },
  {
    companyName: "Home Sparkle",
    category: "Cleaning Services",
    subcategory: "House Cleaning",
    image: "https://images.unsplash.com/photo-1580130857334-2f9b6d01d99d",
    youtubeLink: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    title: "Premium Home Cleaning",
    description: "Get your home sparkling clean with our professional cleaning crew. Eco-friendly products used.",
    location: "Miami, FL",
  },
  {
    companyName: "Garden Experts",
    category: "Lawn & Outdoor Services",
    subcategory: "Landscaping",
    image: "https://images.unsplash.com/photo-1584445743187-cd8ba040349a",
    title: "Beautiful Landscapes",
    description: "Complete lawn care and landscaping services. Transforming outdoor spaces for over 10 years.",
    location: "Seattle, WA",
  },
];

async function main() {
  console.log("Seeding ads system...");

  // 1. Ensure user exists
  const userEmail = "rakib36@gmail.com";
  let user = await prisma.user.findUnique({ where: { email: userEmail } });

  if (!user) {
    console.log(`User ${userEmail} not found, creating...`);
    const hashedPassword = await bcrypt.hash("admin@123", 10);
    user = await prisma.user.create({
      data: {
        email: userEmail,
        firstName: "Rakib",
        lastName: "Admin",
        password: hashedPassword,
        role: "admin",
        status: "active",
      },
    });
  }

  // 2. Seed categories and subcategories
  for (const cat of adsCategories) {
    const slug = cat.name.toLowerCase().replace(/ & /g, "-").replace(/\s+/g, "-");
    const category = await prisma.adCategory.upsert({
      where: { name: cat.name },
      update: {},
      create: {
        name: cat.name,
        slug: slug,
      },
    });

    for (const sub of cat.subcategories) {
      const subSlug = sub.toLowerCase().replace(/ \/ /g, "-").replace(/ & /g, "-").replace(/\s+/g, "-");
      await prisma.adSubcategory.upsert({
        where: {
          categoryId_name: {
            categoryId: category.id,
            name: sub,
          },
        },
        update: {},
        create: {
          categoryId: category.id,
          name: sub,
          slug: subSlug,
        },
      });
    }
  }

  console.log("Categories and subcategories seeded.");

  // 3. Seed mock ads
  for (const mockAd of mockAds) {
    const category = await prisma.adCategory.findUnique({ where: { name: mockAd.category } });
    if (!category) continue;

    const subcategory = await prisma.adSubcategory.findFirst({
      where: { categoryId: category.id, name: mockAd.subcategory },
    });

    // We don't have a unique constraint that we can use for upsert on Ad easily besides ID
    // So we check if it exists by company name and title
    const existingAd = await prisma.ad.findFirst({
        where: {
            companyName: mockAd.companyName,
            title: mockAd.title
        }
    });

    if (existingAd) {
        await prisma.ad.update({
            where: { id: existingAd.id },
            data: {
                imageUrl: mockAd.image,
                youtubeLink: mockAd.youtubeLink,
                location: mockAd.location,
            }
        });
    } else {
        await prisma.ad.create({
            data: {
                userId: user.id,
                title: mockAd.title,
                companyName: mockAd.companyName,
                description: mockAd.description,
                categoryId: category.id,
                subcategoryId: subcategory?.id,
                imageUrl: mockAd.image,
                youtubeLink: mockAd.youtubeLink,
                location: mockAd.location,
                status: AdStatus.active,
            }
        });
    }
  }

  console.log("Mock ads seeded.");
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
