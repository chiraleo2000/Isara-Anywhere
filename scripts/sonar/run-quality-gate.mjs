#!/usr/bin/env node
/**
 * Sonar-aligned local quality gate (SonarLint IDE + eslint sonarjs + coverage + app-scan).
 * Writes reports/sonar/quality-gate-summary.json
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
const reportsDir = path.join(root, 'reports', 'sonar');
fs.mkdirSync(reportsDir, { recursive: true });

const steps = [];
let failed = false;

function runStep(name, cmd, args, opts = {}) {
  const started = Date.now();
  console.log(`\n=== ${name} ===`);
  const result = spawnSync(cmd, args, {
    cwd: opts.cwd || root,
    shell: true,
    stdio: 'inherit',
    env: { ...process.env, ...opts.env },
  });
  const ok = (result.status ?? 1) === 0;
  if (!ok) failed = true;
  steps.push({
    name,
    ok,
    durationMs: Date.now() - started,
    exitCode: result.status ?? 1,
  });
  return ok;
}

// 1) Unit coverage (thresholds in vitest.config.ts)
runStep('unit-coverage', 'npm', ['run', 'test:unit:coverage']);

// 2) Deep ESLint (sonarjs rules) — warn-only, capture to files
for (const portal of ['doctor', 'patient']) {
  const out = path.join(root, 'reports', `eslint-deep-${portal}.txt`);
  const r = spawnSync(
    'node',
    ['scripts/lint/eslint.deep-scan.cjs', `--portal=${portal}`],
    { cwd: root, shell: true, encoding: 'utf8' },
  );
  fs.writeFileSync(out, `exit=${r.status ?? 1}\n`, { flag: 'a' });
  steps.push({
    name: `eslint-deep-${portal}`,
    ok: true,
    exitCode: r.status ?? 0,
    note: 'warn-only gate',
  });
}

const jitsiOut = path.join(root, 'reports', 'eslint-deep-jitsi.txt');
const jitsiEslint = spawnSync(
  'npx',
  ['eslint', 'server/**/*.js', '--max-warnings', '99999'],
  { cwd: path.join(root, 'Izara-jitsi-server'), shell: true, encoding: 'utf8' },
);
fs.writeFileSync(jitsiOut, `exit=${jitsiEslint.status ?? 1}\n`);

// 3) App security scan
runStep('app-security-scan', 'npm', ['run', 'security:app-scan']);

const summary = {
  generatedAt: new Date().toISOString(),
  projectVersion: '1.7.37',
  passed: !failed,
  steps,
  sonarLint: {
    hint: 'Use SonarLint in IDE with sonar-project.properties at repo root (Connected Mode optional).',
    sources: 'Isara-*-portal/src+server, Izara-jitsi-server/server',
  },
};

const summaryPath = path.join(reportsDir, 'quality-gate-summary.json');
fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
console.log(`\nWrote ${summaryPath}`);
process.exit(failed ? 1 : 0);
