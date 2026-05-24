#!/usr/bin/env node
/**
 * Apply cloud DB migrations (NOTIFY triggers, google_sub, SSO seed).
 * Reads repo-root `.env` for DB_* / DB_PASSWORD only — never writes `.env`.
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const ROOT = path.resolve(__dirname, '..');
const ENV_PATH = path.join(ROOT, '.env');

function parseEnvFile(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) return out;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function getDbConfig() {
  const file = parseEnvFile(ENV_PATH);
  const merged = { ...file, ...process.env };
  const useCloud =
    process.argv.includes('--cloud') || merged.CLOUD_MIGRATE === '1';
  const password =
    merged.DB_PASSWORD ||
    merged.POSTGRES_PASSWORD ||
    merged.CLOUD_DB_PASSWORD;
  if (!password) {
    console.error('❌ DB_PASSWORD required (set in shell or .env)');
    process.exit(1);
  }
  const localHost = merged.DB_HOST || 'localhost';
  const cloudHost = merged.CLOUD_DB_HOST || '35.240.157.230';
  const host =
    useCloud || (localHost === 'localhost' && merged.CLOUD_DB_HOST)
      ? cloudHost
      : localHost;
  return {
    host,
    port: Number.parseInt(merged.CLOUD_DB_PORT || merged.DB_PORT || '5432', 10),
    user: merged.DB_USER || 'postgres',
    password,
    database: merged.DB_NAME || 'izara_phase1',
    ssl: false,
  };
}

async function runSqlFile(client, relPath) {
  const full = path.join(ROOT, relPath);
  if (!fs.existsSync(full)) {
    console.warn(`⚠️  Skip missing: ${relPath}`);
    return;
  }
  console.log(`▶ ${relPath}`);
  const sql = fs.readFileSync(full, 'utf8');
  await client.query(sql);
  console.log(`  ✅ ${relPath}`);
}

async function main() {
  const cfg = getDbConfig();
  console.log(`Connecting ${cfg.user}@${cfg.host}:${cfg.port}/${cfg.database}`);
  const client = new Client(cfg);
  await client.connect();
  try {
    await runSqlFile(client, 'scripts/database/v2.2.0-notify-triggers.sql');
    await runSqlFile(client, 'scripts/database/migrations/2025-add-google-sub.sql');
    await runSqlFile(client, 'scripts/database/seed-sso-test-users.sql');
    console.log('\n✅ Cloud DB migrations complete');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
