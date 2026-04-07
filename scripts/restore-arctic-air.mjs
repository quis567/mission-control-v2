// One-off restore for accidentally deleted Arctic Air Mechanical client.
// Reconstructed from quis567/arctic-air-mechanical repo content.
import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { config } from 'dotenv';
config({ path: '.env.local' });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const slug = 'arctic-air-mechanical';

const existing = await prisma.client.findUnique({ where: { slug } });
if (existing) {
  console.log('Already exists:', existing.id);
  process.exit(0);
}

const client = await prisma.client.create({
  data: {
    businessName: 'Arctic Air Mechanical',
    email: 'info@arcticairmechanical.com',
    phone: '(407) 555-0192',
    businessType: 'HVAC',
    city: 'Orlando',
    state: 'FL',
    slug,
    status: 'active',
    dateAcquired: new Date('2026-04-05'),
    tags: '[]',
    websites: {
      create: {
        url: 'https://heartfelt-medovik-a9cdc7.netlify.app',
        status: 'live',
        hostingProvider: 'netlify',
        cmsPlatform: 'static-html',
      },
    },
  },
  include: { websites: true },
});

console.log('Restored client:', client.id);
console.log('Website:', client.websites[0]?.id);

await prisma.$disconnect();
