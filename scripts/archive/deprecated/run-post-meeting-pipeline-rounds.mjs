#!/usr/bin/env node
/**
 * Two-round brutal validation for post-meeting pipeline.
 * Round 1: unit + integration + stress (collect report)
 * Round 2: wipe temp state, re-run (must pass with zero failures)
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const reportDir = path.join(root, 'reports', 'post-meeting-pipeline');

function runNodeTests(pattern, roundLabel) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const child = spawn(
      process.execPath,
      ['--test', `tests/${pattern}`],
      {
        cwd: path.join(root, 'Izara-jitsi-server'),
        env: {
          ...process.env,
          JWT_SECRET: process.env.JWT_SECRET || 'pipeline-round-test-secret',
          NODE_ENV: 'test',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('close', (code) => {
      resolve({
        roundLabel,
        pattern,
        code,
        durationMs: Date.now() - started,
        stdout,
        stderr,
        pass: code === 0,
      });
    });
    child.on('error', reject);
  });
}

function wipeStressDirs() {
  const tmp = os.tmpdir();
  for (const name of fs.readdirSync(tmp)) {
    if (name.startsWith('izara-pipe-')) {
      try {
        fs.rmSync(path.join(tmp, name), { recursive: true, force: true });
      } catch { /* ignore */ }
    }
  }
}

async function runRound(roundNum) {
  const results = [];
  results.push(await runNodeTests('postMeetingPipeline.test.mjs', `R${roundNum}-unit`));
  results.push(await runNodeTests('recordingCrypto.test.mjs', `R${roundNum}-crypto`));
  results.push(await runNodeTests('postMeetingPipeline.integration.test.mjs', `R${roundNum}-integration`));
  results.push(await runNodeTests('postMeetingPipeline.stress.test.mjs', `R${roundNum}-stress`));
  return results;
}

async function main() {
  const roundArg = process.argv.find((a) => a.startsWith('--round='))?.split('=')[1] || 'all';
  fs.mkdirSync(reportDir, { recursive: true });

  const allResults = [];

  if (roundArg === '1' || roundArg === 'all') {
    console.log('\n========== POST-MEETING PIPELINE ROUND 1 ==========\n');
    const r1 = await runRound(1);
    allResults.push(...r1);
    const report1 = {
      round: 1,
      timestamp: new Date().toISOString(),
      results: r1.map((r) => ({
        label: r.roundLabel,
        pass: r.pass,
        durationMs: r.durationMs,
        exitCode: r.code,
      })),
      failures: r1.filter((r) => !r.pass).map((r) => ({ label: r.roundLabel, stderr: r.stderr.slice(-2000) })),
    };
    fs.writeFileSync(path.join(reportDir, 'round-1-report.json'), JSON.stringify(report1, null, 2));
    console.log('Round 1 report:', path.join(reportDir, 'round-1-report.json'));
    if (r1.some((r) => !r.pass)) {
      console.error('Round 1 had failures');
      process.exitCode = 1;
      if (roundArg === '1') return;
    }
  }

  if (roundArg === '2' || roundArg === 'all') {
    console.log('\n========== POST-MEETING PIPELINE ROUND 2 (clean redo) ==========\n');
    wipeStressDirs();
    const r2 = await runRound(2);
    allResults.push(...r2);
    const report2 = {
      round: 2,
      timestamp: new Date().toISOString(),
      wipedTemp: true,
      results: r2.map((r) => ({
        label: r.roundLabel,
        pass: r.pass,
        durationMs: r.durationMs,
      })),
      failures: r2.filter((r) => !r.pass).map((r) => ({ label: r.roundLabel, stderr: r.stderr.slice(-2000) })),
    };
    fs.writeFileSync(path.join(reportDir, 'round-2-report.json'), JSON.stringify(report2, null, 2));
    console.log('Round 2 report:', path.join(reportDir, 'round-2-report.json'));
    if (r2.some((r) => !r.pass)) {
      console.error('Round 2 REDO failed — not a clean pass');
      process.exitCode = 1;
    } else {
      console.log('Round 2: absolute full pass');
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
