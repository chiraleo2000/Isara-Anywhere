#!/usr/bin/env node
/**
 * Grep guard — cross-origin meeting-server fetches must use credentials: 'include'.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const frontendRoots = [
  path.join(root, 'Isara-doctor-portal', 'frontend'),
  path.join(root, 'Isara-patient-portal', 'frontend'),
];

const CROSS_ORIGIN_RE = /\$\{(?:resolveMeetingServerUrl\(\)|meetingServerUrl)\}/;
const CREDENTIALS_RE = /credentials\s*:\s*['"]include['"]/;

function walkTs(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory() && ent.name !== 'node_modules' && ent.name !== 'dist') {
      walkTs(full, out);
    } else if (/\.(tsx?|jsx?)$/.test(ent.name)) {
      out.push(full);
    }
  }
  return out;
}

const violations = [];

for (const base of frontendRoots) {
  for (const file of walkTs(base)) {
    const src = fs.readFileSync(file, 'utf8');
    if (!CROSS_ORIGIN_RE.test(src)) continue;

    let idx = 0;
    while (idx < src.length) {
      const fetchIdx = src.indexOf('fetch(', idx);
      if (fetchIdx === -1) break;
      const windowEnd = Math.min(src.length, fetchIdx + 800);
      const chunk = src.slice(fetchIdx, windowEnd);
      if (CROSS_ORIGIN_RE.test(chunk) && !CREDENTIALS_RE.test(chunk)) {
        violations.push(path.relative(root, file));
        break;
      }
      idx = fetchIdx + 6;
    }
  }
}

if (violations.length) {
  console.error('❌ credentials-include-meeting: cross-origin meeting fetch without credentials:include:');
  for (const v of [...new Set(violations)]) console.error(`  - ${v}`);
  process.exit(1);
}

console.log('✅ credentials-include-meeting: cross-origin meeting fetches use credentials:include');
process.exit(0);
