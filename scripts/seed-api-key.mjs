import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import pg from 'pg';
import crypto from 'crypto';

const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL });

async function main() {
  await client.connect();
  console.log('Connected to database');

  // Check if key already exists
  const existing = await client.query(
    "SELECT * FROM api_keys WHERE label = 'lead-gen-system' LIMIT 1"
  );

  if (existing.rows.length > 0) {
    const row = existing.rows[0];
    console.log('API key already exists:');
    console.log(`  Label:  ${row.label}`);
    console.log(`  Key:    ${row.key}`);
    console.log(`  Active: ${row.active}`);
    return;
  }

  const id = crypto.randomUUID();
  const key = crypto.randomUUID();

  await client.query(
    'INSERT INTO api_keys (id, key, label, active, created_at) VALUES ($1, $2, $3, $4, NOW())',
    [id, key, 'lead-gen-system', true]
  );

  console.log('API key created:');
  console.log(`  Label: lead-gen-system`);
  console.log(`  Key:   ${key}`);
  console.log('');
  console.log('Copy this key into your mcp-server/.env file as CRM_API_KEY');
}

main()
  .catch(console.error)
  .finally(() => client.end());
