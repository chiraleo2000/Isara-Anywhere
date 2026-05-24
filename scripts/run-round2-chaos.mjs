#!/usr/bin/env node
/**
 * Round 2 — Aggressive multi-party lobby + pipeline chaos tests
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const reportDir = path.join(root, 'reports', 'round2-chaos');

function runTests(label, patterns) {
  return new Promise((resolve) => {
    const files = patterns.map((p) => `tests/${p}`);
    const child = spawn(process.execPath, ['--test', ...files], {
      cwd: path.join(root, 'Izara-jitsi-server'),
      env: {
        ...process.env,
        JWT_SECRET: process.env.JWT_SECRET || 'round2-chaos-test-secret',
        NODE_ENV: 'test',
      },
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
      resolve({ label, code, stdout, stderr, pass: code === 0 });
    });
  });
}

async function main() {
  fs.mkdirSync(reportDir, { recursive: true });
  const started = new Date().toISOString();
  console.log('\n========== ROUND 2 CHAOS (Lobby + Pipeline) ==========\n');

  const suites = [
    await runTests('auth-playback', ['round2-auth-playback.test.mjs']),
    await runTests('lobby-chaos', ['round2-lobby-chaos.test.mjs']),
    await runTests('pipeline-chaos', ['round2-pipeline-chaos.test.mjs']),
    await runTests('regression-post-meeting', [
      'postMeetingPipeline.test.mjs',
      'recordingCrypto.test.mjs',
      'postMeetingPipeline.integration.test.mjs',
      'postMeetingPipeline.stress.test.mjs',
    ]),
  ];

  const report = { started, suites, pass: suites.every((s) => s.pass) };
  const outPath = path.join(reportDir, `round2-${Date.now()}.json`);
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`\nReport: ${outPath}`);
  console.log(report.pass ? '\n✅ ROUND 2 CHAOS — ALL PASS\n' : '\n❌ ROUND 2 CHAOS — FAILURES\n');
  process.exit(report.pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
