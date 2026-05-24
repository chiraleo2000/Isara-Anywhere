#!/usr/bin/env node
/**
 * Code Breaker Loop — 3 rounds, self-correcting, cloud + local
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const reportDir = path.join(root, 'reports', 'code-breaker');
const ledger = [];

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
    child.on('close', (code) => {
      resolve({ label: opts.label, code, stdout, stderr, pass: code === 0 });
    });
  });
}

async function round1() {
  console.log('\n╔══ CODE BREAKER ROUND 1 — Network & Latency Chaos ══╗\n');
  const steps = [
    await run('node', ['--test', 'tests/code-breaker-round1-network.test.mjs'], {
      cwd: path.join(root, 'Izara-jitsi-server'),
      label: 'CB1-local-network',
      env: { IZARA_CHAOS_AI_LATENCY_MS: '100', JWT_SECRET: 'code-breaker-r1' },
    }),
    await run('node', ['--test', 'tests/round2-lobby-chaos.test.mjs'], {
      cwd: path.join(root, 'Izara-jitsi-server'),
      label: 'CB1-lobby-regression',
    }),
  ];
  if (process.env.SKIP_CLOUD_E2E !== '1') {
    steps.push(
      await run(
        'npx',
        [
          'playwright',
          'test',
          '--project=A-auth',
          '--project=D-appointments',
          '--project=R1-code-breaker-network',
          '--workers=1',
        ],
        {
          label: 'CB1-cloud-lobby-reconnect',
          env: { TEST_ENV: 'cloud' },
        },
      ),
    );
  }
  const pass = steps.every((s) => s.pass);
  ledger.push({ round: 1, pass, steps: steps.map((s) => ({ label: s.label, pass: s.pass })) });
  return pass;
}

async function round2() {
  console.log('\n╔══ CODE BREAKER ROUND 2 — Data Corruption ══╗\n');
  const steps = [
    await run('node', ['--test', 'tests/code-breaker-round2-corruption.test.mjs'], {
      cwd: path.join(root, 'Izara-jitsi-server'),
      label: 'CB2-local-corruption',
    }),
    await run('node', ['--test', 'tests/code-breaker-round2-cloud.test.mjs'], {
      cwd: path.join(root, 'Izara-jitsi-server'),
      label: 'CB2-cloud-corruption',
    }),
    await run('node', ['--test', 'tests/requestValidation.test.mjs'], {
      cwd: path.join(root, 'Izara-jitsi-server'),
      label: 'CB2-validation-unit',
    }),
  ];
  const pass = steps.every((s) => s.pass);
  ledger.push({ round: 2, pass, steps: steps.map((s) => ({ label: s.label, pass: s.pass })) });
  return pass;
}

async function round3() {
  console.log('\n╔══ CODE BREAKER ROUND 3 — Clean-Slate Full Rerun ══╗\n');
  if (process.env.SKIP_CLOUD_RESET !== '1') {
    const reset = await run(
      'pwsh',
      ['-NoProfile', '-File', 'scripts/cleanup-cloud-test-data.ps1', '-Reseed'],
      { label: 'CB3-cloud-reset-reseed' },
    );
    if (!reset.pass) {
      ledger.push({ round: 3, pass: false, steps: [{ label: reset.label, pass: false }] });
      return false;
    }
  }
  const steps = [
    await run('npm', ['run', 'test:zero-exception'], { label: 'CB3-zero-exception' }),
  ];
  if (process.env.SKIP_CLOUD_E2E !== '1') {
    steps.push(
      await run('npx', ['playwright', 'test', '--project=Q-meeting-lifecycle', '--workers=1'], {
        label: 'CB3-cloud-meeting-lifecycle',
        env: { TEST_ENV: 'cloud' },
      }),
    );
  }
  const pass = steps.every((s) => s.pass);
  ledger.push({ round: 3, pass, steps: steps.map((s) => ({ label: s.label, pass: s.pass })) });
  return pass;
}

async function main() {
  fs.mkdirSync(reportDir, { recursive: true });
  let attempt = 0;
  let r1 = false;
  let r2 = false;
  let r3 = false;

  while (attempt < 3 && !(r1 && r2 && r3)) {
    attempt += 1;
    console.log(`\n>>> Code Breaker attempt ${attempt}\n`);
    if (!r1) r1 = await round1();
    if (r1 && !r2) r2 = await round2();
    if (r1 && r2 && !r3) r3 = await round3();
    if (!(r1 && r2 && r3)) {
      console.warn('\n⚠️ Round failed — fix code and re-run (deploy if cloud probes failed)\n');
    }
  }

  const out = path.join(reportDir, `code-breaker-${Date.now()}.json`);
  fs.writeFileSync(out, JSON.stringify({ ledger, r1, r2, r3, attempt }, null, 2));
  console.log(`\nLedger: ${out}`);
  const allPass = r1 && r2 && r3;
  console.log(allPass ? '\n✅ CODE BREAKER — ALL 3 ROUNDS PASS\n' : '\n❌ CODE BREAKER — INCOMPLETE\n');
  process.exit(allPass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
