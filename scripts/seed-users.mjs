import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import pg from 'pg';
import bcrypt from 'bcryptjs';

const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL });

async function main() {
  await client.connect();
  console.log('Connected to database');

  // Change these to your actual credentials
  const users = [
    { name: 'Admin', email: 'admin@truepathstudios.com', role: 'admin' },
    { name: 'User', email: 'user@truepathstudios.com', role: 'user' },
  ];

  // Default password for initial setup — change after first login
  const defaultPassword = 'TruePath2026!';
  const hash = await bcrypt.hash(defaultPassword, 12);

  for (const user of users) {
    await client.query(
      `INSERT INTO users (id, name, email, password, role, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())
       ON CONFLICT (email) DO UPDATE SET name=$1, password=$3, role=$4`,
      [user.name, user.email, hash, user.role]
    );
    console.log(`  Seeded user: ${user.email} (${user.role})`);
  }

  console.log(`\nDefault password: ${defaultPassword}`);
  console.log('Change these after first login!');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => client.end());
