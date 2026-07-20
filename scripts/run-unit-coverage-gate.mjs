#!/usr/bin/env node
/**
 * Unit coverage gate.
 * - Non-Windows: npm run test:unit:coverage
 * - Windows + USE_DOCKER_COVERAGE=1 (default): Docker Istanbul via test:unit:docker:coverage
 * - Windows + USE_DOCKER_COVERAGE=0: legacy stub (process-contracts only) — not used by this plan
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const isWin = process.platform === 'win32';
const useDocker =
  process.env.USE_DOCKER_COVERAGE === '1' ||
  (isWin && process.env.USE_DOCKER_COVERAGE !== '0');

/** Keep in sync with tests/unit/vitest.config.ts coverage.thresholds */
const THRESHOLDS = {
  lines: 60,
  statements: 60,
  functions: 55,
  branches: 50,
};

function run(cmd, args) {
  return spawnSync(cmd, args, { cwd: root, shell: true, stdio: 'inherit' });
}

function coverageSummaryPath() {
  return path.join(root, 'tests/unit/coverage/coverage-summary.json');
}

function assertThresholds() {
  const summaryPath = coverageSummaryPath();
  if (!fs.existsSync(summaryPath)) {
    console.error('[unit-coverage-gate] FAIL: tests/unit/coverage/coverage-summary.json missing');
    process.exit(1);
  }
  const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
  const total = summary.total;
  if (!total) {
    console.error('[unit-coverage-gate] FAIL: coverage-summary.json has no total');
    process.exit(1);
  }
  const lineTotal = total.lines?.total ?? 0;
  if (lineTotal <= 0) {
    console.error(
      '[unit-coverage-gate] FAIL: coverage collected 0 files (check coverage.include paths / sibling mounts)',
    );
    process.exit(1);
  }
  const failures = [];
  for (const [metric, min] of Object.entries(THRESHOLDS)) {
    const pct = total[metric]?.pct;
    if (typeof pct !== 'number' || Number.isNaN(pct) || pct < min) {
      failures.push(`${metric}=${pct ?? 'n/a'} (need ≥${min})`);
    }
  }
  if (failures.length) {
    console.error('[unit-coverage-gate] FAIL: coverage thresholds not met:', failures.join(', '));
    process.exit(1);
  }
  console.log(
    '[unit-coverage-gate] thresholds ok:',
    Object.entries(THRESHOLDS)
      .map(([k, min]) => `${k} ${total[k].pct}% (≥${min})`)
      .join(', '),
  );
}

function archiveSummary() {
  const src = coverageSummaryPath();
  const destDir = path.join(root, 'reports');
  fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(src, path.join(destDir, 'unit-coverage-summary.json'));
  console.log('[unit-coverage-gate] coverage summary → reports/unit-coverage-summary.json');
}

if (isWin && useDocker) {
  console.log('[unit-coverage-gate] Windows: USE_DOCKER_COVERAGE — running Docker Istanbul coverage');
  const r = run('npm', ['run', 'test:unit:docker:coverage']);
  if ((r.status ?? 1) !== 0) process.exit(r.status ?? 1);
  assertThresholds();
  archiveSummary();
  process.exit(0);
}

if (isWin) {
  console.warn(
    '[unit-coverage-gate] Windows: USE_DOCKER_COVERAGE=0 — stub (process-contracts only); not a real % gate',
  );
  const smoke = run('npm', ['run', 'test:unit:process-contracts']);
  process.exit(smoke.status ?? 1);
}

const r = run('npm', ['run', 'test:unit:coverage']);
if ((r.status ?? 1) !== 0) process.exit(r.status ?? 1);
assertThresholds();
archiveSummary();
process.exit(0);
