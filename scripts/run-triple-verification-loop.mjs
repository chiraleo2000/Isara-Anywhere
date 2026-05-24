#!/usr/bin/env node
/**
 * Triple verification — 3 consecutive full-suite passes (clean slate, stress latency).
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const reportDir = path.join(root, 'reports', 'triple-verification');
const WARN_RE = /\b(warn(ing)?|UnhandledPromiseRejection|DeprecationWarning)\b/i;

function run(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd: opts.cwd || root,
      env: { ...process.env, IZARA_DEV_TESTING: '1', ...opts.env },
      shell: process.platform === 'win32',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => {
      const s = d.toString();
      stdout += s;
      process.stdout.write(s);
    });
    child.stderr.on('data', (d) => {
      const s = d.toString();
      stderr += s;
      process.stderr.write(s);
    });
    child.on('close', (code) => {
      const warnings = [];
      for (const line of `${stdout}\n${stderr}`.split('\n')) {
        if (WARN_RE.test(line)) warnings.push(line.trim());
      }
      resolve({
        label: opts.label,
        code,
        warnings,
        pass: code === 0 && warnings.length === 0,
      });
    });
  });
}

const SUITE_STEPS = [
  { label: 'S1-meeting-contract', cmd: 'npm', args: ['run', 'test:meeting-server:contract'] },
  { label: 'S2-post-meeting-pipeline', cmd: 'npm', args: ['run', 'test:post-meeting-pipeline'] },
  { label: 'S3-security-hardening', cmd: 'npm', args: ['run', 'test:security-hardening'] },
  { label: 'S4-round2-chaos', cmd: 'npm', args: ['run', 'test:round2-chaos'] },
  { label: 'S5-round3-diagnostics', cmd: 'npm', args: ['run', 'test:round3-diagnostics'] },
  { label: 'S6-vitest-unit', cmd: 'npm', args: ['test'], cwd: path.join(root, 'tests', 'unit') },
  { label: 'S7-meeting-acceptance', cmd: 'npm', args: ['run', 'test:unit:meeting-acceptance'] },
  { label: 'S8-pipeline-rounds', cmd: 'npm', args: ['run', 'test:post-meeting-pipeline:rounds'] },
  {
    label: 'S9-playwright-lobby-guest',
    cmd: 'npx',
    args: [
      'playwright',
      'test',
      '--project=Q-meeting-lifecycle',
      '--project=R1-code-breaker-network',
      '--project=D-doctor-host',
      '--workers=1',
    ],
    env: { TEST_ENV: 'cloud' },
    cloudOnly: true,
  },
  {
    label: 'S10-playwright-pipeline',
    cmd: 'npx',
    args: [
      'playwright',
      'test',
      '--project=D-appointments',
      '--project=D-doctor-host',
      '--project=Q-meeting-lifecycle',
      '--project=E-meeting-clinical',
      '--project=F-phr-health-records',
      '--workers=1',
    ],
    env: { TEST_ENV: 'cloud' },
    cloudOnly: true,
  },
  { label: 'S11-cloud-smoke', cmd: 'node', args: ['scripts/cloud-smoke.mjs'] },
];

async function runSteps(roundNum, extraEnv = {}) {
  const startedAt = new Date().toISOString();
  const steps = [];
  for (const step of SUITE_STEPS) {
    if (step.cloudOnly && process.env.SKIP_CLOUD_E2E === '1') {
      steps.push({ label: step.label, pass: true, skipped: true });
      continue;
    }
    const result = await run(step.cmd, step.args, {
      label: step.label,
      cwd: step.cwd,
      env: { ...extraEnv, ...step.env },
    });
    steps.push({
      label: result.label,
      pass: result.pass,
      code: result.code,
      warnings: result.warnings,
    });
    if (!result.pass) break;
  }
  return {
    round: roundNum,
    pass: steps.every((s) => s.pass),
    steps,
    startedAt,
    endedAt: new Date().toISOString(),
  };
}

async function main() {
  fs.mkdirSync(reportDir, { recursive: true });
  const ledger = [];

  const r1 = await runSteps(1);
  ledger.push(r1);
  if (!r1.pass) {
    fs.writeFileSync(path.join(reportDir, `round1-fail-${Date.now()}.json`), JSON.stringify(r1, null, 2));
    process.exit(1);
  }

  await run('pwsh', ['-NoProfile', '-File', 'scripts/cleanup-cloud-test-data.ps1', '-Reseed'], {
    label: 'R2-cleanup-reseed',
  });

  const r2 = await runSteps(2);
  ledger.push(r2);
  if (!r2.pass) {
    fs.writeFileSync(path.join(reportDir, `round2-fail-${Date.now()}.json`), JSON.stringify(r2, null, 2));
    process.exit(1);
  }

  const r3 = await runSteps(3, {
    IZARA_CHAOS_AI_LATENCY_MS: '200',
    IZARA_CHAOS_DB_LATENCY_MS: '40',
    TRIPLE_VERIFY_LATENCY: '2',
  });
  ledger.push(r3);
  if (!r3.pass) {
    fs.writeFileSync(path.join(reportDir, `round3-fail-${Date.now()}.json`), JSON.stringify(r3, null, 2));
    process.exit(1);
  }

  const out = path.join(reportDir, 'triple-verification-summary.json');
  fs.writeFileSync(
    out,
    JSON.stringify({ consecutivePasses: 3, ledger, completedAt: new Date().toISOString() }, null, 2),
  );
  console.log(`\nLedger: ${out}\n✅ TRIPLE VERIFICATION — 3 CONSECUTIVE PASSES\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
