// One-off: add deleted_at column to clients table for soft-delete support.
import pg from 'pg';
import { config } from 'dotenv';
config({ path: '.env.local' });

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

await client.query(`
  ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP(3)
`);
await client.query(`
  CREATE INDEX IF NOT EXISTS clients_deleted_at_idx ON clients (deleted_at)
`);

console.log('OK: deleted_at column ready');
await client.end();
