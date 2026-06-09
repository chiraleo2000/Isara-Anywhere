#!/usr/bin/env node
/**
 * Run Vitest in Docker by logical group (avoids OOM on large full-suite runs).
 * Usage: npm run test:unit:docker:grouped
 *        npm run test:unit:docker:grouped -- doctor patient
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const workspaceMount = process.platform === 'win32'
  ? `${repoRoot.replaceAll('\\', '/')}:/workspace`
  : `${repoRoot}:/workspace`;

const ALL_GROUPS = [
  { id: 'doctor', cmd: 'npm run test:doctor' },
  { id: 'patient', cmd: 'npm run test:patient' },
  { id: 'meeting', cmd: 'npm run test:meeting-server' },
  { id: 'cross', cmd: 'npx cross-env TEST_GROUP=cross-portal vitest run' },
  { id: 'auth', cmd: 'npm run test:auth' },
  { id: 'appointments', cmd: 'npm run test:appointments' },
  { id: 'clinical', cmd: 'npm run test:clinical' },
  { id: 'security', cmd: 'npm run test:security' },
  { id: 'database', cmd: 'npm run test:database' },
];

const requested = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const groups = requested.length
  ? ALL_GROUPS.filter((g) => requested.includes(g.id))
  : ALL_GROUPS;

if (!groups.length) {
  console.error('[docker:grouped] Unknown group. Available:', ALL_GROUPS.map((g) => g.id).join(', '));
  process.exit(1);
}

const shellScript = [
  'npm ci',
  ...groups.map((g) => `echo "=== GROUP ${g.id} ===" && ${g.cmd}`),
].join(' && ');

console.log('[docker:grouped] Running groups:', groups.map((g) => g.id).join(', '));

const result = spawnSync(
  'docker',
  [
    'run',
    '--rm',
    '-v',
    workspaceMount,
    '-w',
    '/workspace/tests/unit',
    'node:20-alpine',
    'sh',
    '-c',
    shellScript,
  ],
  { stdio: 'inherit', shell: false },
);

if (result.error) {
  console.error('[docker:grouped] Failed:', result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
