#!/usr/bin/env node
/**
 * Aggregate Playwright pre-debug baseline results into docs/markdown/ledgers/PRE_DEBUG_BASELINE_LEDGER.md
 * Usage: node scripts/aggregate-pre-debug-baseline.mjs [--env local|cloud]
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function parseArgs() {
  let env = 'local';
  for (let i = 2; i < process.argv.length; i++) {
    if (process.argv[i] === '--env' && process.argv[i + 1]) env = process.argv[++i];
  }
  return { env };
}

function gitShortSha() {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: root, encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

function loadReport() {
  const jsonPath = path.join(root, 'test-results', 'full-coverage-results.json');
  if (!fs.existsSync(jsonPath)) return null;
  return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
}

function flatten(suites, out = []) {
  for (const suite of suites || []) {
    for (const spec of suite.specs || []) {
      const title = [...(suite.title ? [suite.title] : []), spec.title].filter(Boolean).join(' > ');
      for (const t of spec.tests || []) {
        const r = t.results?.[0];
        out.push({
          project: t.projectName || '',
          title,
          status: r?.status || t.status,
          error: r?.error?.message?.slice(0, 200) || '',
        });
      }
    }
    flatten(suite.suites, out);
  }
  return out;
}

function main() {
  const { env } = parseArgs();
  const report = loadReport();
  const ledgerPath = path.join(root, 'docs', 'markdown', 'ledgers', 'PRE_DEBUG_BASELINE_LEDGER.md');
  const now = new Date().toISOString();
  const lines = [
    '# Pre-Debug Baseline Ledger',
    '',
    '| Field | Value |',
    '|-------|-------|',
    `| Environment | ${env} |`,
    `| Generated | ${now} |`,
    `| Commit | ${gitShortSha()} |`,
    '',
  ];

  if (!report) {
    lines.push(
      '> No `test-results/full-coverage-results.json` found. Run headed baseline first:',
      '',
      '```powershell',
      'npm run test:baseline:local',
      '# Cloud (requires GEMINI_API_KEY for meeting AI steps):',
      'npm run test:baseline:cloud',
      '```',
      '',
      '**Blocker:** Cloud Playwright meeting/AI groups need `GEMINI_API_KEY` in environment (see `scripts/run-cloud-tests.ps1`).',
      '',
    );
  } else {
    const tests = flatten(report.suites);
    const passed = tests.filter((t) => t.status === 'expected' || t.status === 'passed').length;
    const failed = tests.filter((t) => t.status === 'unexpected' || t.status === 'failed').length;
    lines.push(`| Passed | ${passed} |`, `| Failed | ${failed} |`, '', '## Failures', '');
    for (const t of tests.filter((x) => x.status === 'unexpected' || x.status === 'failed')) {
      lines.push(`- **${t.project}** — ${t.title}: ${t.error || '(no message)'}`);
    }
    if (failed === 0) lines.push('_No failures recorded._');
  }

  fs.mkdirSync(path.dirname(ledgerPath), { recursive: true });
  fs.writeFileSync(ledgerPath, lines.join('\n') + '\n', 'utf8');
  console.log(`Wrote ${ledgerPath}`);
}

main();
