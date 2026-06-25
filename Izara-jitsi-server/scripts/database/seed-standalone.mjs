#!/usr/bin/env node
/**
 * Seed minimal dev data for standalone smoke tests.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const seedFile = path.join(appRoot, 'scripts/database/seed-dev-data.sql');

const client = new pg.Client({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5436),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'izara_phase1',
});

async function main() {
  if (!fs.existsSync(seedFile)) {
    console.error(`❌ Missing ${seedFile} — run npm run db:bundle:apps from platform`);
    process.exit(1);
  }
  await client.connect();
  const sql = fs.readFileSync(seedFile, 'utf8');
  console.log('Applying seed-dev-data.sql...');
  await client.query(sql);
  await client.end();
  console.log('✅ db:seed:standalone complete');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
