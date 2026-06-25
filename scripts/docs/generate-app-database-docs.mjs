#!/usr/bin/env node
/**
 * Generate docs/DATABASE.md per app from table-ownership.json
 *
 * Usage:
 *   node scripts/docs/generate-app-database-docs.mjs --all
 *   node scripts/docs/generate-app-database-docs.mjs patient doctor meeting
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ownership = JSON.parse(
  fs.readFileSync(path.join(repoRoot, 'scripts/docs/table-ownership.json'), 'utf8'),
);
const today = new Date().toISOString().slice(0, 10);

const APPS = {
  patient: { dir: 'Isara-patient-portal', title: 'Patient Portal Database', pgPort: 5434, appPort: 3005 },
  doctor: { dir: 'Isara-doctor-portal', title: 'Doctor Portal Database', pgPort: 5435, appPort: 3010 },
  meeting: { dir: 'Izara-jitsi-server', title: 'Meeting Server Database', pgPort: 5436, appPort: 3020 },
};

function tablesForApp(appKey) {
  const primary = [];
  const sharedRead = [];
  for (const [name, meta] of Object.entries(ownership.tables)) {
    const reads = meta.readBy ?? [];
    if (meta.owner === appKey) {
      primary.push({ name, meta });
    } else if (reads.includes(appKey)) {
      sharedRead.push({ name, meta });
    }
  }
  primary.sort((a, b) => a.name.localeCompare(b.name));
  sharedRead.sort((a, b) => a.name.localeCompare(b.name));
  return { primary, sharedRead };
}

function row(t) {
  const note = t.meta.primaryWriter ? `writes: ${t.meta.primaryWriter}` : `owner: ${t.meta.owner}`;
  return `| \`${t.name}\` | ${t.meta.category} | ${note} |`;
}

function renderDatabaseMd(appKey) {
  const cfg = APPS[appKey];
  const { primary, sharedRead } = tablesForApp(appKey);
  const listeners = ownership.notifyListeners[appKey] ?? [];

  return `# ${cfg.title}

> **Generated:** ${today} · **Schema:** ${ownership.schemaVersion} · **Tables mapped:** ${ownership.tableCount}
> **SSOT:** \`${ownership.ssot}\` · **Ownership:** \`scripts/docs/table-ownership.json\`
> **Reference:** [Processes/DATABASE_TABLES_REFERENCE.md](../../Processes/DATABASE_TABLES_REFERENCE.md)

Standalone Postgres: **127.0.0.1:${cfg.pgPort}** · App: **http://localhost:${cfg.appPort}**

## Primary tables (this service owns writes)

| Table | Category | Notes |
|-------|----------|-------|
${primary.length ? primary.map(row).join('\n') : '| _none_ | | |'}

## Shared / cross-service read

| Table | Category | Notes |
|-------|----------|-------|
${sharedRead.length ? sharedRead.map(row).join('\n') : '| _none_ | | |'}

## LISTEN/NOTIFY (this service)

${listeners.length ? listeners.map((t) => `- \`${t}\``).join('\n') : '- _(none configured)_'}

Channel \`data_changes\` — see \`scripts/database/v2.2.0-notify-triggers.sql\`.

## Standalone init

\`\`\`bash
docker compose -f docker-compose.standalone.yml up -d postgres
npm run db:init:standalone
npm run db:seed:standalone
\`\`\`

Bundled SQL: \`scripts/database/\` via \`npm run db:bundle:apps\` (read-only; migrations only on platform).
`;
}

const argApps = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const targets = process.argv.includes('--all') || !argApps.length ? Object.keys(APPS) : argApps;

console.log('\n=== Generate app DATABASE.md ===\n');
for (const appKey of targets) {
  if (!APPS[appKey]) {
    console.error(`Unknown app: ${appKey}`);
    process.exit(1);
  }
  const outDir = path.join(repoRoot, APPS[appKey].dir, 'docs');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'DATABASE.md');
  const { primary, sharedRead } = tablesForApp(appKey);
  fs.writeFileSync(outPath, renderDatabaseMd(appKey), 'utf8');
  console.log(`${APPS[appKey].title}: ${outPath} (primary=${primary.length}, shared=${sharedRead.length})`);
}
console.log('');
