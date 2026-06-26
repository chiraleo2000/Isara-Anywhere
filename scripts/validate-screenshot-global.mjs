#!/usr/bin/env node
/**
 * Cross-group screenshot audit — fail on duplicate SHA256 across all group folders.
 * Usage: npm run test:screenshots:global
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const screenshotsRoot = path.join(root, 'docs', 'screenshots');

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function collectPngs(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) collectPngs(full, acc);
    else if (ent.name.toLowerCase().endsWith('.png')) acc.push(full);
  }
  return acc;
}

const files = collectPngs(screenshotsRoot).filter((f) => !f.replace(/\\/g, '/').includes('/browsers/'));
const byHash = new Map();
const errors = [];

for (const file of files) {
  const hash = sha256(file);
  const rel = path.relative(root, file).replace(/\\/g, '/');
  const bucket = byHash.get(hash) ?? [];
  bucket.push(rel);
  byHash.set(hash, bucket);
}

for (const [hash, paths] of byHash) {
  if (paths.length <= 1) continue;
  const byBasename = new Map();
  for (const p of paths) {
    const base = path.basename(p);
    const groupMatch = p.replace(/\\/g, '/').match(/docs\/screenshots\/(group-[^/]+)/);
    const group = groupMatch ? groupMatch[1] : 'other';
    const key = base;
    const bucket = byBasename.get(key) ?? new Set();
    bucket.add(group);
    byBasename.set(key, bucket);
  }
  for (const [base, groups] of byBasename) {
    if (groups.size > 1) {
      errors.push(`Duplicate basename ${base} (SHA256 ${hash.slice(0, 12)}…) across groups: ${[...groups].join(', ')}`);
    }
  }
}

const report = {
  checkedAt: new Date().toISOString(),
  pngCount: files.length,
  uniqueHashes: byHash.size,
  errors,
  pass: errors.length === 0,
};

const outPath = path.join(root, 'reports', 'screenshot-global-audit-latest.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(`Global screenshot audit: ${files.length} PNGs, ${byHash.size} unique hashes`);
for (const e of errors) console.error(`  - ${e}`);

process.exit(report.pass ? 0 : 1);
