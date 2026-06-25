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

const pkgVersion = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
const coverageDir = path.join(root, 'tests', 'unit', 'coverage');

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
    ...(opts.note ? { note: opts.note } : {}),
  });
  return ok;
}

function runStepWithRetry(name, cmd, args, { retries = 2 } = {}) {
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    fs.rmSync(coverageDir, { recursive: true, force: true });
    const started = Date.now();
    console.log(`\n=== ${name}${attempt > 1 ? ` (retry ${attempt - 1})` : ''} ===`);
    const result = spawnSync(cmd, args, {
      cwd: root,
      shell: true,
      stdio: 'inherit',
      env: { ...process.env },
    });
    const ok = (result.status ?? 1) === 0;
    if (ok) {
      steps.push({ name, ok: true, durationMs: Date.now() - started, exitCode: 0, attempts: attempt });
      return true;
    }
    if (attempt <= retries) {
      console.warn(`[${name}] attempt ${attempt} failed (exit ${result.status}); retrying…`);
    } else {
      failed = true;
      steps.push({
        name,
        ok: false,
        durationMs: Date.now() - started,
        exitCode: result.status ?? 1,
        attempts: attempt,
      });
      return false;
    }
  }
  return false;
}

// 1) Unit coverage — Windows uses test:unit via coverage:gate (vitest .tmp flake)
runStep('unit-coverage', 'npm', ['run', 'test:unit:coverage:gate']);

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
  ['eslint', 'backend/**/*.js', '--max-warnings', '99999'],
  { cwd: path.join(root, 'Izara-jitsi-server'), shell: true, encoding: 'utf8' },
);
fs.writeFileSync(jitsiOut, `exit=${jitsiEslint.status ?? 1}\n`);

// 3) App security scan
runStep('app-security-scan', 'npm', ['run', 'security:app-scan']);

const summary = {
  generatedAt: new Date().toISOString(),
  projectVersion: pkgVersion,
  passed: !failed,
  steps,
  sonarLint: {
    hint: 'Use SonarLint in IDE with sonar-project.properties at repo root (Connected Mode optional).',
    sources: 'Isara-*-portal/frontend+backend, Izara-jitsi-server/backend',
  },
};

const summaryPath = path.join(reportsDir, 'quality-gate-summary.json');
fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
console.log(`\nWrote ${summaryPath}`);
process.exit(failed ? 1 : 0);
