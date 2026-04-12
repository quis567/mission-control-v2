// One-off: link Arctic Air Mechanical website to its GitHub repo and Netlify site.
// Run after the restore so the integrations panel shows the connection.
import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { config } from 'dotenv';
config({ path: '.env.local' });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const SLUG = 'arctic-air-mechanical';
const GITHUB_REPO_URL = 'https://github.com/quis567/arctic-air-mechanical';
const NETLIFY_HOST = 'heartfelt-medovik-a9cdc7.netlify.app';

const client = await prisma.client.findUnique({
  where: { slug: SLUG },
  include: { websites: true },
});

if (!client) {
  console.error('Client not found');
  process.exit(1);
}

const website = client.websites[0];
if (!website) {
  console.error('Client has no website record');
  process.exit(1);
}

// Look up the Netlify site ID by hostname
const netlifyRes = await fetch('https://api.netlify.com/api/v1/sites', {
  headers: { Authorization: `Bearer ${process.env.NETLIFY_ACCESS_TOKEN}` },
});
if (!netlifyRes.ok) {
  console.error('Netlify API error:', netlifyRes.status);
  process.exit(1);
}
const sites = await netlifyRes.json();
const match = sites.find(s =>
  (s.ssl_url || s.url || '').includes(NETLIFY_HOST) ||
  s.name === NETLIFY_HOST.replace('.netlify.app', '')
);

if (!match) {
  console.error(`Netlify site not found for ${NETLIFY_HOST}`);
  console.error('Available sites:', sites.slice(0, 5).map(s => s.name));
  process.exit(1);
}

console.log(`Found Netlify site: ${match.name} (${match.id})`);

const updated = await prisma.website.update({
  where: { id: website.id },
  data: {
    githubRepoUrl: GITHUB_REPO_URL,
    netlifySiteId: match.id,
    hostingProvider: 'netlify',
    status: 'live',
  },
});

console.log('Linked website:', updated.id);
console.log('  GitHub:', updated.githubRepoUrl);
console.log('  Netlify site ID:', updated.netlifySiteId);

await prisma.$disconnect();
