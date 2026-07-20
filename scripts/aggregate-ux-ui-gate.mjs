#!/usr/bin/env node
/**
 * Aggregate UX/UI gate evidence — phase ledgers, screenshot audits, Playwright report link.
 * Usage: node scripts/aggregate-ux-ui-gate.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const reportsDir = path.join(root, 'reports');
fs.mkdirSync(reportsDir, { recursive: true });

function gitShortHash() {
  const r = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : 'unknown';
}

function readJsonIfExists(relPath) {
  const abs = path.join(root, relPath);
  if (!fs.existsSync(abs)) return null;
  try {
    return JSON.parse(fs.readFileSync(abs, 'utf8'));
  } catch {
    return null;
  }
}

function collectLedgerRounds() {
  const dir = path.join(root, 'reports/local-error-ledger');
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.startsWith('round-') && f.endsWith('.json'))
    .sort()
    .map((f) => {
      const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      return {
        file: path.relative(root, path.join(dir, f)).replace(/\\/g, '/'),
        round: data.round ?? f,
        totalTests: data.totalTests ?? data.testCount ?? null,
        p0Count: data.p0Count ?? null,
        pass: data.pass ?? data.failures?.length === 0,
      };
    });
}

function countGroupPngs() {
  const ssRoot = path.join(root, 'docs/screenshots');
  if (!fs.existsSync(ssRoot)) return {};
  const counts = {};
  for (const ent of fs.readdirSync(ssRoot, { withFileTypes: true })) {
    if (!ent.isDirectory() || !ent.name.startsWith('group-')) continue;
    const dir = path.join(ssRoot, ent.name);
    const pngs = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.png'));
    counts[ent.name] = pngs.length;
  }
  return counts;
}

const unitGate = readJsonIfExists('reports/local-unit-gate-latest.json');
const screenshotAudit = readJsonIfExists('reports/screenshot-audit-latest.json');
const screenshotGlobal = readJsonIfExists('reports/screenshot-global-audit-latest.json');
const playwrightReport = path.join(root, 'playwright-report/index.html');

const summary = {
  checkedAt: new Date().toISOString(),
  gitShortHash: gitShortHash(),
  pass: Boolean(unitGate?.pass) && Boolean(screenshotAudit?.pass !== false),
  unitGate: unitGate
    ? { pass: unitGate.pass, checkedAt: unitGate.checkedAt, logPath: unitGate.logPath }
    : null,
  screenshotAudit: screenshotAudit
    ? {
        pass: screenshotAudit.pass,
        checkedAt: screenshotAudit.checkedAt,
        groupCount: screenshotAudit.groups?.length ?? 0,
        failedGroups: (screenshotAudit.groups ?? []).filter((g) => !g.pass).map((g) => g.groupName),
      }
    : null,
  screenshotGlobal: screenshotGlobal
    ? { pass: screenshotGlobal.pass, duplicateCount: screenshotGlobal.duplicateCount ?? null }
    : null,
  ledgerRounds: collectLedgerRounds(),
  groupPngCounts: countGroupPngs(),
  playwrightReport: fs.existsSync(playwrightReport)
    ? path.relative(root, playwrightReport).replace(/\\/g, '/')
    : null,
};

if (screenshotAudit?.pass === false) summary.pass = false;

const outPath = path.join(reportsDir, 'ux-ui-gate-latest.json');
fs.writeFileSync(outPath, `${JSON.stringify(summary, null, 2)}\n`);
console.log(`UX/UI gate summary: ${path.relative(root, outPath)} (pass=${summary.pass})`);
process.exit(summary.pass ? 0 : 1);
