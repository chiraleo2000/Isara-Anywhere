#!/usr/bin/env node
/**
 * Zero-exception suite — meeting contracts, crypto, unit, webhook, cloud smoke.
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function run(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd: opts.cwd || root,
      env: { ...process.env, ...opts.env },
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
    child.on('close', (code) => resolve({ label: opts.label, code, stdout, stderr, pass: code === 0 }));
  });
}

async function main() {
  const suites = [
    await run('npm', ['run', 'test:security-hardening'], { label: 'security-hardening' }),
    await run('npm', ['run', 'test:meeting-server:contract'], { label: 'meeting-server-contract' }),
    await run('npm', ['run', 'test:unit:meeting-acceptance'], { label: 'meeting-acceptance' }),
    await run('npm', ['test'], { cwd: path.join(root, 'tests', 'unit'), label: 'vitest-unit-2620' }),
    await run('npx', [
      'vitest',
      'run',
      'meeting-server/joinConfigAcceptance.test.ts',
      'meeting-server/meetingCreateAcceptance.test.ts',
      'meeting-server/hostReadyGate.test.ts',
      'meeting-server/lobbyKeyResolve.test.ts',
      'meeting-server/meetingRuntimeApi.test.ts',
      'meeting-server/jibriWebhook.test.ts',
      'cross-portal/jitsiMeetingConfig.test.ts',
    ], { cwd: path.join(root, 'tests', 'unit'), label: 'meeting-acceptance-21plus' }),
    await run('node', ['scripts/cloud-smoke.mjs'], { label: 'cloud-smoke' }),
  ];

  const failed = suites.filter((s) => !s.pass);
  console.log('\n========== ZERO-EXCEPTION SUMMARY ==========');
  for (const s of suites) {
    console.log(`${s.pass ? '✅' : '❌'} ${s.label}`);
  }
  if (failed.length) {
    console.error('\nFailed suites:', failed.map((f) => f.label).join(', '));
    process.exit(1);
  }
  console.log('\n✅ ALL SUITES PASSED\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
