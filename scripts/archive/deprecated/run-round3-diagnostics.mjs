#!/usr/bin/env node
/**
 * Round 3 — Stability diagnostics (disk cleanup, schema bounds, regression)
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const reportDir = path.join(root, 'reports', 'round3-stability');

function runTests(label, patterns, cwd) {
  return new Promise((resolve) => {
    const files = patterns.map((p) => (p.includes('/') ? p : `tests/${p}`));
    const child = spawn(process.execPath, ['--test', ...files], {
      cwd,
      env: {
        ...process.env,
        JWT_SECRET: process.env.JWT_SECRET || 'round3-diagnostics-secret',
        NODE_ENV: 'test',
        RECORDING_LOCAL_RETENTION: 'delete_after_persist',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    child.stdout.on('data', (d) => {
      const s = d.toString();
      stdout += s;
      process.stdout.write(s);
    });
    child.stderr.on('data', (d) => process.stderr.write(d.toString()));
    child.on('close', (code) => resolve({ label, code, stdout, pass: code === 0 }));
  });
}

async function probeCloud() {
  const meeting =
    process.env.MEETING_SERVER_URL ||
    'https://izara-meeting-server-dev-testing-724889190329.asia-southeast1.run.app';
  const doctor =
    process.env.DOCTOR_PORTAL_URL ||
    'https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app';
  const lines = [];
  for (const [name, base] of [
    ['meeting', meeting],
    ['doctor', doctor],
  ]) {
    try {
      const res = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(15_000) });
      lines.push(`${name}: ${res.status} ${await res.text().then((t) => t.slice(0, 120))}`);
    } catch (e) {
      lines.push(`${name}: FAIL ${e.message}`);
    }
  }
  try {
    const res = await fetch(`${meeting}/api/health/stability`, {
      signal: AbortSignal.timeout(15_000),
    });
    lines.push(`stability: ${res.status} ${await res.text()}`);
  } catch (e) {
    lines.push(`stability: SKIP (${e.message}) — deploy latest meeting server for this probe`);
  }
  return lines;
}

async function main() {
  fs.mkdirSync(reportDir, { recursive: true });
  console.log('\n========== ROUND 3 STABILITY DIAGNOSTICS ==========\n');

  const suites = [
    await runTests('round3-stability', ['round3-stability.test.mjs'], path.join(root, 'Izara-jitsi-server')),
    await runTests('round2-regression', ['round2-auth-playback.test.mjs', 'round2-pipeline-chaos.test.mjs'], path.join(root, 'Izara-jitsi-server')),
    await runTests('crypto-regression', ['recordingCrypto.test.mjs'], path.join(root, 'Izara-jitsi-server')),
  ];

  let cloud = [];
  if (process.env.SKIP_CLOUD_PROBE !== '1') {
    console.log('\n--- Cloud probes ---\n');
    cloud = await probeCloud();
    cloud.forEach((l) => console.log(l));
  }

  const pass = suites.every((s) => s.pass);
  const report = { started: new Date().toISOString(), suites, cloud, pass };
  const outPath = path.join(reportDir, `round3-${Date.now()}.json`);
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`\nReport: ${outPath}`);
  console.log(pass ? '\n✅ ROUND 3 — ALL PASS\n' : '\n❌ ROUND 3 — FAILURES\n');
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
