#!/usr/bin/env node
/**
 * Run tests/unit inside a Node 20 Docker container (matches CI isolation).
 * Usage: npm run test:unit:docker
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const workspaceMount = process.platform === 'win32'
  ? `${repoRoot.replaceAll('\\', '/')}:/workspace`
  : `${repoRoot}:/workspace`;

const dockerArgs = [
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
];

console.log('[docker] Running unit tests in node:20-alpine …');
const result = spawnSync('docker', dockerArgs, { stdio: 'inherit', shell: false });
if (result.error) {
  console.error('[docker] Failed to start container:', result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
