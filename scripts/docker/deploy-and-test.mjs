#!/usr/bin/env node
/**
 * Deploy latest Izara stack via docker-compose, wait for health, then run tests in Docker.
 * Usage: npm run test:unit:docker:deploy
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { waitForPortalHealth } from './e2eDockerCommon.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const envFile = path.join(repoRoot, '.env.docker');
const composeFile = path.join(repoRoot, 'docker-compose.yml');

function run(cmd, args, opts = {}) {
  console.log(`\n> ${cmd} ${args.join(' ')}`);
  const result = spawnSync(cmd, args, {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: false,
    ...opts,
  });
  if (result.error) {
    console.error(`[deploy-and-test] Failed: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function runCapture(cmd, args) {
  return spawnSync(cmd, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    shell: false,
  });
}

const composeBase = [
  'compose',
  '-f',
  composeFile,
  '--env-file',
  envFile,
];

console.log('[deploy-and-test] Step 1/5 — reset stack volumes (fresh DB) …');
run('docker', [...composeBase, 'down', '-v', '--remove-orphans']);

console.log('[deploy-and-test] Step 2/5 — build and start latest stack …');
run('docker', [...composeBase, 'up', '-d', '--build', '--remove-orphans']);

console.log('[deploy-and-test] Step 3/5 — wait for service health …');
const services = ['postgres', 'patient-portal', 'doctor-portal', 'meeting-server'];
const maxWaitMs = 600_000;
const pollMs = 10_000;
const start = Date.now();

while (Date.now() - start < maxWaitMs) {
  const ps = runCapture('docker', [...composeBase, 'ps', '--format', 'json']);
  if (ps.status !== 0) {
    console.error('[deploy-and-test] docker compose ps failed');
    process.exit(ps.status ?? 1);
  }
  const lines = ps.stdout.trim().split('\n').filter(Boolean);
  const rows = lines.map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      return null;
    }
  }).filter(Boolean);

  const tracked = rows.filter((r) => services.includes(r.Service));
  const unhealthy = tracked.filter((r) => {
    const health = r.Health || '';
    if (health && health !== 'healthy') return true;
    if (!health && r.State !== 'running') return true;
    return false;
  });

  if (tracked.length >= services.length && unhealthy.length === 0) {
    console.log('[deploy-and-test] All core services healthy.');
    break;
  }

  const pending = unhealthy.map((r) => `${r.Service}:${r.Health || r.State}`).join(', ');
  console.log(`[deploy-and-test] Waiting (${Math.round((Date.now() - start) / 1000)}s) — ${pending || 'starting…'}`);
  spawnSync('node', ['-e', `setTimeout(()=>{}, ${pollMs})`], { stdio: 'ignore' });
}

if (Date.now() - start >= maxWaitMs) {
  console.error('[deploy-and-test] Timed out waiting for healthy services.');
  run('docker', [...composeBase, 'ps']);
  process.exit(1);
}

console.log('[deploy-and-test] Step 3b/5 — verify portal /api/health endpoints …');
if (!waitForPortalHealth(repoRoot, { includeMeeting: true, timeoutMs: 120_000 })) {
  console.error('[deploy-and-test] HTTP health probe failed for doctor/patient/meeting portals.');
  process.exit(1);
}

console.log('[deploy-and-test] Step 4/5 — unit tests in node:20-alpine …');
const workspaceMount = process.platform === 'win32'
  ? `${repoRoot.replaceAll('\\', '/')}:/workspace`
  : `${repoRoot}:/workspace`;

run('docker', [
  'run',
  '--rm',
  '-v',
  workspaceMount,
  '-w',
  '/workspace/tests/unit',
  'node:20-alpine',
  'sh',
  '-c',
  'npm ci && npm test',
]);

console.log('[deploy-and-test] Step 5/5 — meeting-server contract tests …');
run('docker', [
  'run',
  '--rm',
  '-v',
  workspaceMount,
  '-w',
  '/workspace',
  'node:20-alpine',
  'sh',
  '-c',
  'node --test Izara-jitsi-server/tests/*.test.mjs',
]);

console.log('\n[deploy-and-test] All steps passed.');
