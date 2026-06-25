#!/usr/bin/env node
/**
 * Full docs sync: pages + DATABASE.md + per-app doc stubs
 * Usage: npm run docs:sync-to-apps
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const scriptsDir = path.join(repoRoot, 'scripts/docs');

function run(script) {
  const r = spawnSync(process.execPath, [path.join(scriptsDir, script)], {
    cwd: repoRoot,
    stdio: 'inherit',
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

run('sync-process-pages-to-apps.mjs');
run('generate-app-database-docs.mjs');
run('generate-app-doc-stubs.mjs');

console.log('\n✅ docs:sync-to-apps complete');
