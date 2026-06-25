#!/usr/bin/env node
/**
 * Sync Processes/Pages → per-app docs/pages/ with SSOT header (idempotent).
 *
 * Usage:
 *   npm run docs:sync-to-apps
 *   node scripts/docs/sync-process-pages-to-apps.mjs --portal patient
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const today = new Date().toISOString().slice(0, 10);

const MAP = [
  {
    src: 'Processes/Pages/Patient-Portal',
    dest: 'Isara-patient-portal/docs/pages',
    label: 'Patient',
    repo: 'Isara-patient-portal',
    portalKey: 'patient',
  },
  {
    src: 'Processes/Pages/Doctor-Portal',
    dest: 'Isara-doctor-portal/docs/pages',
    label: 'Doctor',
    repo: 'Isara-doctor-portal',
    portalKey: 'doctor',
  },
  {
    src: 'Processes/Pages/Meeting-Server',
    dest: 'Izara-jitsi-server/docs/pages',
    label: 'Meeting',
    repo: 'Izara-jitsi-server',
    portalKey: 'meeting',
  },
];

const HEADER_RE = /^> \*\*SSOT source:\*\*[\s\S]*?(?=\n# |\n## |$)/;

function parsePortalFilter() {
  const idx = process.argv.indexOf('--portal');
  if (idx < 0 || !process.argv[idx + 1]) return MAP;
  const key = process.argv[idx + 1].toLowerCase();
  const filtered = MAP.filter((m) => m.portalKey === key);
  if (!filtered.length) {
    console.error(`Unknown portal: ${key}`);
    process.exit(1);
  }
  return filtered;
}

function buildHeader(meta, filename) {
  return [
    `> **SSOT source:** \`${meta.src}/${filename}\``,
    `> **Synced:** ${today}`,
    `> **Portal:** ${meta.label} (\`${meta.repo}\`)`,
    '> **Use:** Page specification — edit canonical copy in platform `Processes/`; refresh via `npm run docs:sync-to-apps`.',
    '',
  ].join('\n');
}

function stripHeader(content) {
  return content.replace(HEADER_RE, '').replace(/^\n+/, '');
}

function syncEntry(meta) {
  const src = path.join(repoRoot, meta.src);
  const dest = path.join(repoRoot, meta.dest);
  if (!fs.existsSync(src)) {
    console.error(`Source missing: ${meta.src}`);
    process.exit(1);
  }
  fs.mkdirSync(dest, { recursive: true });
  const files = fs.readdirSync(src).filter((f) => f.endsWith('.md') && f !== 'README.md');
  let updated = 0;
  let unchanged = 0;
  for (const file of files) {
    const body = fs.readFileSync(path.join(src, file), 'utf8');
    const next = buildHeader(meta, file) + stripHeader(body);
    const out = path.join(dest, file);
    if (fs.existsSync(out) && fs.readFileSync(out, 'utf8') === next) {
      unchanged += 1;
    } else {
      fs.writeFileSync(out, next, 'utf8');
      updated += 1;
    }
  }
  console.log(`${meta.label}: ${updated} updated, ${unchanged} unchanged (${files.length} pages)`);
  return files.length;
}

console.log('\n=== Sync Processes/Pages → app docs/pages ===\n');
let total = 0;
for (const meta of parsePortalFilter()) {
  total += syncEntry(meta);
}
console.log(`\nTotal: ${total} page specs\n`);
