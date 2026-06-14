#!/usr/bin/env node
/**
 * Unified local security scan orchestrator.
 *
 * Runs: app-security-scan → CVE Lite → npm audit:prod → security-hardening tests
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
const reportsDir = path.join(root, 'reports', 'security');

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
  return { name, ok, durationMs: Date.now() - started, exitCode: result.status ?? 1 };
}

function main() {
  fs.mkdirSync(reportsDir, { recursive: true });

  const stepDefs = [
    ['app-security-scan', 'npm', ['run', 'security:app-scan']],
    ['cve-lite', 'node', ['scripts/security/run-cve-lite-scan.mjs']],
    ['audit-prod', 'npm', ['run', 'audit:prod']],
    ['security-hardening', 'npm', ['run', 'test:security-hardening']],
  ];
  const steps = stepDefs.map(([name, cmd, args]) => runStep(name, cmd, args));

  const failed = steps.filter((s) => !s.ok);
  const summary = {
    generatedAt: new Date().toISOString(),
    passed: failed.length === 0,
    steps,
  };
  fs.writeFileSync(path.join(reportsDir, 'scan-summary.json'), JSON.stringify(summary, null, 2));

  console.log('\n=== security:scan summary ===');
  for (const s of steps) {
    console.log(`  ${s.ok ? 'PASS' : 'FAIL'} ${s.name} (${s.durationMs}ms)`);
  }

  if (failed.length) {
    console.error(`\nsecurity:scan failed: ${failed.map((s) => s.name).join(', ')}`);
    process.exit(1);
  }
  console.log('\nsecurity:scan passed');
}

main();
