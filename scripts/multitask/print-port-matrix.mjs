#!/usr/bin/env node
/**
 * Print port-matrix.json and verify Postgres host ports are isolated per stream.
 *
 * Usage: npm run multitask:ports
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const matrixPath = path.join(repoRoot, 'scripts/multitask/port-matrix.json');
const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));

console.log(`\n=== Isara multitask port matrix (v${matrix.version}) ===\n`);

const pgByStream = new Map();
for (const [key, stream] of Object.entries(matrix.streams)) {
  const pg = stream.postgresHostPort;
  console.log(`${key.toUpperCase()}`);
  if (stream.appUrl) console.log(`  App      : ${stream.appUrl} (:${stream.appPort})`);
  if (stream.appPorts) console.log(`  App ports: ${stream.appPorts.join(', ')}`);
  if (pg != null) {
    console.log(`  Postgres : 127.0.0.1:${pg} (${stream.postgresContainer ?? 'n/a'})`);
    pgByStream.set(key, pg);
  }
  if (stream.composeProjectName) console.log(`  Compose  : ${stream.composeProjectName}`);
  console.log('');
}

const pgPorts = [...pgByStream.entries()];
const pgCollisions = pgPorts.filter(([, port], i) =>
  pgPorts.some(([otherKey, otherPort], j) => i !== j && port === otherPort),
);

if (pgCollisions.length) {
  console.error('POSTGRES PORT COLLISIONS:');
  for (const [key, port] of pgCollisions) {
    console.error(`  ${key} uses :${port}`);
  }
  process.exit(1);
}

const reserved = matrix.reservedPorts ?? [];
const dupReserved = reserved.filter((p, i) => reserved.indexOf(p) !== i);
if (dupReserved.length) {
  console.error('Duplicate reservedPorts entries:', [...new Set(dupReserved)].join(', '));
  process.exit(1);
}

console.log('Postgres ports isolated:', [...pgByStream.values()].sort((a, b) => a - b).join(', '));
console.log(`Reserved host ports: ${reserved.join(', ')}`);
console.log('App URLs (3005/3010/3020) intentionally shared — use one stream per app or isolated compose project names.\n');
