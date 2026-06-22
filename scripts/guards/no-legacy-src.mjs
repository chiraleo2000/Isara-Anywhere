#!/usr/bin/env node
/**
 * Fail when legacy portal layout (src/ or active server/ entrypoints) reappears.
 * Canonical layout: frontend/ + backend/ per portal.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const portals = ['Isara-doctor-portal', 'Isara-patient-portal', 'Izara-jitsi-server'];
const violations = [];

for (const portal of portals) {
  const srcDir = path.join(root, portal, 'src');
  if (fs.existsSync(srcDir)) {
    violations.push(`${portal}/src/ (use frontend/ + backend/)`);
  }

  const legacyEntrypoints = [
    path.join(root, portal, 'server', 'index.ts'),
    path.join(root, portal, 'server', 'index.js'),
    path.join(root, portal, 'server', 'mainApiServer.cjs'),
    path.join(root, portal, 'server', 'startAll.cjs'),
  ];
  for (const entry of legacyEntrypoints) {
    if (fs.existsSync(entry)) {
      violations.push(`${path.relative(root, entry)} (use backend/ entrypoints)`);
    }
  }
}

if (violations.length) {
  console.error('LEGACY-SRC GUARD FAIL — forbidden paths:');
  for (const v of violations) console.error(`  - ${v}`);
  process.exit(1);
}

console.log('LEGACY-SRC GUARD PASS — no forbidden src/ or legacy server entrypoints');
process.exit(0);
