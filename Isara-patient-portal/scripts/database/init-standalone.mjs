#!/usr/bin/env node
/**
 * Apply bundled SQL to standalone Postgres (host port from env DB_PORT).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dbDir = path.join(appRoot, 'scripts/database');

const ORDER = [
  'izara-database.sql',
  'migrations/v2.0.0-phase2-tables.sql',
  'migrations/v2.1.0-phase2-ai-his.sql',
  'v2.2.0-notify-triggers.sql',
  'migrations/2025-add-google-sub.sql',
  'migrations/2025-ensure-appointment-columns.sql',
];

const client = new pg.Client({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5434),
  user: process.env.DB_USER || process.env.POSTGRES_USER || 'postgres',
  password: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD || 'postgres',
  database: process.env.DB_NAME || process.env.POSTGRES_DB || 'izara_phase1',
});

async function main() {
  await client.connect();
  for (const rel of ORDER) {
    const file = path.join(dbDir, rel);
    if (!fs.existsSync(file)) {
      console.warn(`⚠️ Skip missing ${rel}`);
      continue;
    }
    const sql = fs.readFileSync(file, 'utf8');
    console.log(`Applying ${rel}...`);
    await client.query(sql);
  }
  await client.end();
  console.log('✅ db:init:standalone complete');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
