import { PrismaClient } from '@prisma/client';
import { IconType } from '@prisma/client';
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
  // Existing
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

  // Home Services
  { name: "Plumbing", icon: "🔧", iconType: IconType.emoji, color: "#3b82f6", description: "Professional plumbing services and repairs." },
  { name: "Electrical", icon: "⚡", iconType: IconType.emoji, color: "#eab308", description: "Electrical repairs and installations." },
  { name: "HVAC / Heating & Air Conditioning", icon: "❄️", iconType: IconType.emoji, color: "#06b6d4", description: "Heating and cooling system maintenance." },
  { name: "Appliance Repair", icon: "🔌", iconType: IconType.emoji, color: "#64748b", description: "Repair services for home appliances." },
  { name: "Handyman Services", icon: "🔨", iconType: IconType.emoji, color: "#d97706", description: "General home repairs and odd jobs." },
  { name: "Locksmith", icon: "🔑", iconType: IconType.emoji, color: "#f59e0b", description: "Lock installation and unlocking services." },
  { name: "Pest Control", icon: "🐜", iconType: IconType.emoji, color: "#84cc16", description: "Pest extermination and control services." },
  { name: "Roofing", icon: "🏠", iconType: IconType.emoji, color: "#a16207", description: "Roof repairs and installations." },
  { name: "Flooring", icon: "🪵", iconType: IconType.emoji, color: "#92400e", description: "Flooring installation and repairs." },
  { name: "Painting", icon: "🖌️", iconType: IconType.emoji, color: "#3b82f6", description: "Interior and exterior painting services." },
  { name: "Drywall Repair", icon: "🧱", iconType: IconType.emoji, color: "#a8a29e", description: "Drywall installation and repair." },
  { name: "Window Installation & Repair", icon: "🪟", iconType: IconType.emoji, color: "#38bdf8", description: "Window replacement and repairs." },
  { name: "Pressure Washing", icon: "💦", iconType: IconType.emoji, color: "#0ea5e9", description: "Exterior pressure washing services." },
  { name: "Gutter Cleaning", icon: "🍂", iconType: IconType.emoji, color: "#d97706", description: "Professional gutter cleaning." },
  { name: "Insulation", icon: "🌡️", iconType: IconType.emoji, color: "#f97316", description: "Home insulation services." },

  // Cleaning Services
  { name: "House Cleaning", icon: "🧹", iconType: IconType.emoji, color: "#14b8a6", description: "General house cleaning services." },
  { name: "Deep Cleaning", icon: "🧽", iconType: IconType.emoji, color: "#0d9488", description: "Thorough deep cleaning for your home." },
  { name: "Move-In / Move-Out Cleaning", icon: "📦", iconType: IconType.emoji, color: "#6366f1", description: "Cleaning services for moving." },
  { name: "Carpet Cleaning", icon: "🧶", iconType: IconType.emoji, color: "#8b5cf6", description: "Professional carpet cleaning." },
  { name: "Window Cleaning", icon: "✨", iconType: IconType.emoji, color: "#38bdf8", description: "Streak-free window cleaning." },
  { name: "Office Cleaning", icon: "🏢", iconType: IconType.emoji, color: "#64748b", description: "Commercial and office cleaning." },
  { name: "Junk Removal", icon: "🗑️", iconType: IconType.emoji, color: "#78716c", description: "Removal of unwanted items and junk." },

  // Construction & Renovation
  { name: "Remodeling", icon: "🏗️", iconType: IconType.emoji, color: "#f59e0b", description: "Home remodeling and renovation." },
  { name: "General Contracting", icon: "👷", iconType: IconType.emoji, color: "#d97706", description: "General contracting services." },
  { name: "Kitchen Remodeling", icon: "🍳", iconType: IconType.emoji, color: "#f97316", description: "Kitchen upgrades and remodeling." },
  { name: "Bathroom Remodeling", icon: "🛁", iconType: IconType.emoji, color: "#06b6d4", description: "Bathroom renovation services." },
  { name: "Concrete Work", icon: "🧱", iconType: IconType.emoji, color: "#9ca3af", description: "Concrete pouring and repairs." },
  { name: "Framing", icon: "🪵", iconType: IconType.emoji, color: "#92400e", description: "Structural framing services." },
  { name: "Masonry", icon: "🧱", iconType: IconType.emoji, color: "#78716c", description: "Brickwork and masonry." },
  { name: "Fence Installation", icon: "🤺", iconType: IconType.emoji, color: "#a16207", description: "Fence building and repairs." },
  { name: "Deck Building", icon: "🪵", iconType: IconType.emoji, color: "#92400e", description: "Custom deck construction." },

  // Lawn & Outdoor Services
  { name: "Landscaping", icon: "🌳", iconType: IconType.emoji, color: "#16a34a", description: "Professional landscaping services." },
  { name: "Lawn Care", icon: "🌱", iconType: IconType.emoji, color: "#22c55e", description: "Lawn mowing and maintenance." },
  { name: "Tree Trimming", icon: "✂️", iconType: IconType.emoji, color: "#15803d", description: "Tree pruning and removal." },
  { name: "Gardening", icon: "🌷", iconType: IconType.emoji, color: "#ec4899", description: "Garden care and planting." },
  { name: "Sprinkler Repair", icon: "🚿", iconType: IconType.emoji, color: "#0ea5e9", description: "Irrigation system repairs." },
  { name: "Pool Cleaning", icon: "🏊", iconType: IconType.emoji, color: "#0284c7", description: "Swimming pool maintenance." },
  { name: "Snow Removal", icon: "❄️", iconType: IconType.emoji, color: "#94a3b8", description: "Snow plowing and clearing." },

  // Moving & Transportation
  { name: "Movers", icon: "🚚", iconType: IconType.emoji, color: "#3b82f6", description: "Professional moving services." },
  { name: "Packing Services", icon: "📦", iconType: IconType.emoji, color: "#f59e0b", description: "Packing and unpacking assistance." },
  { name: "Furniture Assembly", icon: "🪑", iconType: IconType.emoji, color: "#8b5cf6", description: "Assembly of flat-pack furniture." },
  { name: "Hauling", icon: "🚛", iconType: IconType.emoji, color: "#64748b", description: "Transporting large items." },
  { name: "Delivery Services", icon: "🛵", iconType: IconType.emoji, color: "#10b981", description: "Local delivery services." },
  { name: "Towing", icon: "🛻", iconType: IconType.emoji, color: "#dc2626", description: "Vehicle towing services." },

  // Automotive Services
  { name: "Auto Repair", icon: "🚘", iconType: IconType.emoji, color: "#dc2626", description: "General auto repair services." },
  { name: "Car Detailing", icon: "✨", iconType: IconType.emoji, color: "#38bdf8", description: "Professional car detailing." },
  { name: "Mobile Mechanic", icon: "👨‍🔧", iconType: IconType.emoji, color: "#f59e0b", description: "On-the-go auto repairs." },
  { name: "Tire Services", icon: "🛞", iconType: IconType.emoji, color: "#1f2937", description: "Tire replacement and repair." },
  { name: "Oil Change", icon: "🛢️", iconType: IconType.emoji, color: "#fb923c", description: "Quick oil change services." },
  { name: "Car Wash", icon: "🧽", iconType: IconType.emoji, color: "#0ea5e9", description: "Exterior and interior car washing." },

  // Health & Beauty
  { name: "Hair Stylist", icon: "💇", iconType: IconType.emoji, color: "#ec4899", description: "Haircutting and styling services." },
  { name: "Barber", icon: "💈", iconType: IconType.emoji, color: "#3b82f6", description: "Professional barber services." },
  { name: "Makeup Artist", icon: "💄", iconType: IconType.emoji, color: "#db2777", description: "Makeup for events and occasions." },
  { name: "Nail Technician", icon: "💅", iconType: IconType.emoji, color: "#f472b6", description: "Manicure and pedicure services." },
  { name: "Massage Therapy", icon: "💆", iconType: IconType.emoji, color: "#8b5cf6", description: "Relaxing massage therapy." },
  { name: "Personal Trainer", icon: "🏋️", iconType: IconType.emoji, color: "#f97316", description: "Fitness training and coaching." },

  // Business Services
  { name: "Accounting / Bookkeeping", icon: "📊", iconType: IconType.emoji, color: "#10b981", description: "Financial tracking and bookkeeping." },
  { name: "Tax Preparation", icon: "📄", iconType: IconType.emoji, color: "#059669", description: "Assistance with tax filing." },
  { name: "Legal Services", icon: "⚖️", iconType: IconType.emoji, color: "#1f2937", description: "Legal advice and consultation." },
  { name: "Notary Public", icon: "🖋️", iconType: IconType.emoji, color: "#475569", description: "Document notarization services." },
  { name: "Marketing Services", icon: "📈", iconType: IconType.emoji, color: "#3b82f6", description: "Digital and traditional marketing." },
  { name: "Graphic Design", icon: "🎨", iconType: IconType.emoji, color: "#ec4899", description: "Professional graphic design." },
  { name: "Printing Services", icon: "🖨️", iconType: IconType.emoji, color: "#64748b", description: "Document and material printing." },
  { name: "Virtual Assistant", icon: "💻", iconType: IconType.emoji, color: "#8b5cf6", description: "Remote administrative support." },

  // Tech Services
  { name: "Computer Repair", icon: "💻", iconType: IconType.emoji, color: "#3b82f6", description: "PC and Mac repair services." },
  { name: "Phone Repair", icon: "📱", iconType: IconType.emoji, color: "#2563eb", description: "Smartphone repair and screen replacement." },
  { name: "IT Support", icon: "🖥️", iconType: IconType.emoji, color: "#1d4ed8", description: "Technical support and troubleshooting." },
  { name: "Wi-Fi Setup", icon: "📶", iconType: IconType.emoji, color: "#0ea5e9", description: "Network and router setup." },
  { name: "Website Design", icon: "🌐", iconType: IconType.emoji, color: "#8b5cf6", description: "Web development and design." },
  { name: "App Development", icon: "📲", iconType: IconType.emoji, color: "#10b981", description: "Mobile application development." },
  { name: "Cybersecurity", icon: "🔒", iconType: IconType.emoji, color: "#ef4444", description: "Security auditing and protection." },

  // Education & Lessons
  { name: "Tutoring", icon: "📚", iconType: IconType.emoji, color: "#f59e0b", description: "Academic tutoring for all ages." },
  { name: "Music Lessons", icon: "🎵", iconType: IconType.emoji, color: "#ec4899", description: "Instrument and vocal lessons." },
  { name: "Language Lessons", icon: "🗣️", iconType: IconType.emoji, color: "#3b82f6", description: "Learn a new language." },
  { name: "Test Prep", icon: "📝", iconType: IconType.emoji, color: "#10b981", description: "Preparation for standardized tests." },
  { name: "Driving Lessons", icon: "🚗", iconType: IconType.emoji, color: "#f97316", description: "Driving instruction and practice." },

  // Event Services
  { name: "Catering", icon: "🍽️", iconType: IconType.emoji, color: "#f59e0b", description: "Food services for events." },
  { name: "DJ Services", icon: "🎧", iconType: IconType.emoji, color: "#8b5cf6", description: "Music and entertainment." },
  { name: "Photography", icon: "📷", iconType: IconType.emoji, color: "#3b82f6", description: "Professional photography services." },
  { name: "Videography", icon: "🎥", iconType: IconType.emoji, color: "#ef4444", description: "Event video recording and editing." },
  { name: "Event Planning", icon: "📅", iconType: IconType.emoji, color: "#ec4899", description: "Comprehensive event coordination." },
  { name: "Party Rentals", icon: "🎈", iconType: IconType.emoji, color: "#10b981", description: "Rental equipment for parties." },
  { name: "Security Services", icon: "🛡️", iconType: IconType.emoji, color: "#1f2937", description: "Event security and crowd control." },

  // Pet Services
  { name: "Dog Walking", icon: "🐕", iconType: IconType.emoji, color: "#10b981", description: "Daily dog walking services." },
  { name: "Pet Sitting", icon: "🐈", iconType: IconType.emoji, color: "#f59e0b", description: "In-home pet care." },
  { name: "Grooming", icon: "✂️", iconType: IconType.emoji, color: "#ec4899", description: "Pet grooming and bathing." },
  { name: "Pet Training", icon: "🎾", iconType: IconType.emoji, color: "#3b82f6", description: "Obedience and behavior training." },
  { name: "Veterinary Services", icon: "🩺", iconType: IconType.emoji, color: "#ef4444", description: "Medical care for pets." },

  // Family & Personal Care
  { name: "Babysitting", icon: "👶", iconType: IconType.emoji, color: "#f472b6", description: "Childcare services." },
  { name: "Elder Care", icon: "👵", iconType: IconType.emoji, color: "#8b5cf6", description: "Assistance for senior citizens." },
  { name: "Companion Care", icon: "🤝", iconType: IconType.emoji, color: "#10b981", description: "Companionship for those in need." },
  { name: "House Sitting", icon: "🏡", iconType: IconType.emoji, color: "#f59e0b", description: "Home monitoring while you're away." },

  // Shopping & Errands
  { name: "Grocery Delivery", icon: "🛒", iconType: IconType.emoji, color: "#ec6f27", description: "Groceries brought to your door." },
  { name: "Prescription Pickup", icon: "💊", iconType: IconType.emoji, color: "#ef4444", description: "Pharmacy medication pickup." },
  { name: "Courier Services", icon: "📦", iconType: IconType.emoji, color: "#3b82f6", description: "Package delivery and courier." },
  { name: "Food Delivery", icon: "🍔", iconType: IconType.emoji, color: "#f59e0b", description: "Restaurant food delivery." },

  // Specialty Services
  { name: "Private Investigator", icon: "🕵️", iconType: IconType.emoji, color: "#1f2937", description: "Private investigation services." },
  { name: "Security Guard Services", icon: "👮", iconType: IconType.emoji, color: "#374151", description: "Personal or property security." },
  { name: "Personal Assistant", icon: "💼", iconType: IconType.emoji, color: "#8b5cf6", description: "Dedicated personal assistance." },
  { name: "Concierge Services", icon: "🛎️", iconType: IconType.emoji, color: "#d97706", description: "Premium lifestyle management." },
  { name: "Custom Requests / Other", icon: "🌟", iconType: IconType.emoji, color: "#6366f1", description: "Any other custom tasks you need." },
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
