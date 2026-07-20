#!/usr/bin/env node
/**
 * Audit issara-doctor/.env against v5.2 required keys.
 * Exits 0 when all required keys present and forbidden keys absent.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const envPath = path.join(root, 'issara-doctor', '.env');

const REQUIRED = [
  'MEETING_SERVER_URL',
  'MEETING_PUBLIC_URL',
  'GOOGLE_MAPS_API_KEY',
  'JITSI_APP_ID',
  'CORS_ORIGINS',
  'JWT_SECRET',
  'GEMINI_API_KEY',
  'DATABASE_URL',
];

const FORBIDDEN = [
  'VITE_GOOGLE_CLIENT_SECRET',
  'GOOGLE_CLIENT_SECRET',
  'VITE_ENABLE_RAG',
  'VITE_RAG_CHUNK_SIZE',
  'CLOUD_RUN_DOCTOR_URL',
];

function parseEnv(text) {
  const keys = new Set();
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq > 0) keys.add(t.slice(0, eq).trim());
  }
  return keys;
}

if (!fs.existsSync(envPath)) {
  console.error(`ENV-AUDIT FAIL — missing ${envPath}`);
  process.exit(1);
}

const keys = parseEnv(fs.readFileSync(envPath, 'utf8'));
const missing = REQUIRED.filter((k) => !keys.has(k));
const forbidden = FORBIDDEN.filter((k) => keys.has(k));
const anyVite = [...keys].filter((k) => k.startsWith('VITE_'));

if (missing.length || forbidden.length || anyVite.length) {
  if (missing.length) console.error('ENV-AUDIT missing:', missing.join(', '));
  if (forbidden.length) console.error('ENV-AUDIT forbidden:', forbidden.join(', '));
  if (anyVite.length) console.error('ENV-AUDIT remove VITE_* keys:', anyVite.join(', '));
  process.exit(1);
}

console.log(`ENV-AUDIT PASS — ${REQUIRED.length} required keys, 0 forbidden keys`);
process.exit(0);
