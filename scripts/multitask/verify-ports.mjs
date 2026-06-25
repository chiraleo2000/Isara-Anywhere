#!/usr/bin/env node
/**
 * Print port-matrix and verify Postgres host ports are isolated per stream.
 * App ports (3005/3010/3020) may overlap platform vs standalone — use compose project names.
 *
 * Usage: npm run multitask:ports
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const matrixPath = path.join(repoRoot, 'scripts/multitask/port-matrix.json');
const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));

console.log('=== Isara multitask port matrix ===\n');

const pgByStream = new Map();
for (const [key, cfg] of Object.entries(matrix.streams)) {
  console.log(`${key.toUpperCase()}`);
  if (cfg.appUrl) console.log(`  App      : ${cfg.appUrl} (:${cfg.appPort})`);
  if (cfg.appPorts) console.log(`  App ports: ${cfg.appPorts.join(', ')}`);
  if (cfg.postgresHostPort != null) {
    console.log(`  Postgres : 127.0.0.1:${cfg.postgresHostPort} (${cfg.postgresContainer ?? 'n/a'})`);
    pgByStream.set(key, cfg.postgresHostPort);
  }
  if (cfg.composeProjectName) console.log(`  Compose  : ${cfg.composeProjectName}`);
  console.log('');
}

const pgPorts = [...pgByStream.entries()];
const seen = new Map();
let ok = true;
for (const [stream, port] of pgPorts) {
  if (seen.has(port)) {
    console.error(`Postgres collision: :${port} used by ${seen.get(port)} and ${stream}`);
    ok = false;
  } else {
    seen.set(port, stream);
  }
}

if (!ok) {
  console.error('\nFix port-matrix.json postgresHostPort values.');
  process.exit(1);
}

console.log(`Postgres isolated: ${[...seen.keys()].sort((a, b) => a - b).join(', ')}`);
if (matrix.reservedPorts?.length) {
  console.log(`Reserved: ${matrix.reservedPorts.join(', ')}`);
}
console.log('\nNo Postgres port collisions. App URLs shared by design — one stream per machine or isolated compose projects.\n');
