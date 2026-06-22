#!/usr/bin/env node
/**
 * Run all unit test domain groups sequentially with logging (Pass 1).
 * Usage: node scripts/run-unit-groups-sequential.mjs [--fail-fast]
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const failFast = process.argv.includes('--fail-fast');

const groups = [
  'test:unit:coverage',
  'test:unit:auth',
  'test:unit:appointments',
  'test:unit:clinical',
  'test:unit:meeting',
  'test:unit:meeting-acceptance',
  'test:unit:ai',
  'test:unit:api',
  'test:unit:database',
  'test:unit:workflows',
  'test:unit:security',
  'test:unit:notifications',
  'test:unit:process-contracts',
  'test:unit:v5-contracts',
  'test:meeting-server:contract',
  'test:post-meeting-pipeline',
  'test:security-hardening',
];

const logDir = path.join(root, 'reports');
fs.mkdirSync(logDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const logPath = path.join(logDir, `local-unit-gate-${stamp}.log`);

const results = [];

function runNpm(script) {
  const started = Date.now();
  console.log(`\n== ${script} ==`);
  const proc = spawnSync('npm', ['run', script], {
    cwd: root,
    shell: true,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  });
  const durationMs = Date.now() - started;
  const ok = proc.status === 0;
  const block = `\n===== ${script} (${ok ? 'PASS' : 'FAIL'}) ${durationMs}ms =====\n${proc.stdout || ''}\n${proc.stderr || ''}\n`;
  fs.appendFileSync(logPath, block);
  results.push({ script, ok, durationMs });
  if (ok) {
    console.log(`PASS ${script}`);
  } else {
    console.error(`FAIL ${script} (exit ${proc.status})`);
  }
  return ok;
}

console.log(`Unit groups sequential — log: ${path.relative(root, logPath)}`);
let allOk = true;
for (const script of groups) {
  const ok = runNpm(script);
  if (!ok) {
    allOk = false;
    if (failFast) break;
  }
}

const summary = { checkedAt: new Date().toISOString(), logPath: path.relative(root, logPath), results, pass: allOk };
fs.writeFileSync(path.join(logDir, 'local-unit-gate-latest.json'), `${JSON.stringify(summary, null, 2)}\n`);
console.log(`\nSummary: ${results.filter((r) => r.ok).length}/${results.length} passed`);
process.exit(allOk ? 0 : 1);
