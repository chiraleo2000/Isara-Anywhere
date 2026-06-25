#!/usr/bin/env node
/**
 * Copy platform SSOT SQL → each app's scripts/database/
 * Usage: npm run db:bundle:apps
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const srcDir = path.join(repoRoot, 'scripts/database');

const FILES = [
  'izara-database.sql',
  'v2.2.0-notify-triggers.sql',
  'seed-dev-data.sql',
  'migrations/v2.0.0-phase2-tables.sql',
  'migrations/v2.1.0-phase2-ai-his.sql',
  'migrations/2025-add-google-sub.sql',
  'migrations/2025-ensure-appointment-columns.sql',
];

const APPS = [
  'Isara-patient-portal',
  'Isara-doctor-portal',
  'Izara-jitsi-server',
];

function copyFile(rel) {
  const src = path.join(srcDir, rel);
  if (!fs.existsSync(src)) {
    console.warn(`⚠️ Skip missing: ${rel}`);
    return;
  }
  for (const app of APPS) {
    const dest = path.join(repoRoot, app, 'scripts/database', rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

for (const rel of FILES) copyFile(rel);

// Per-app seed subset
const seedReadme = `# Database bundle (read-only copy)

Copied from platform \`scripts/database/\` via \`npm run db:bundle:apps\`.
Do not edit schema here — pin schemaVersion in docs/DATABASE.md and change platform SSOT only.
`;

for (const app of APPS) {
  const dir = path.join(repoRoot, app, 'scripts/database');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'README.md'), seedReadme, 'utf8');
  console.log(`✅ ${app}/scripts/database`);
}
