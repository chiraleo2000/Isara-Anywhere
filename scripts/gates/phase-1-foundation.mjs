#!/usr/bin/env node
/** Phase 1 — foundation: docker, smoke, unit waves */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { npmStep, runSteps } from './lib/run-step.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const isWin = process.platform === 'win32';
import { spawnSync } from 'node:child_process';

const steps = [
  {
    name: 'docker-compose',
    cmd: 'docker',
    args: process.env.GATE_SKIP_DOCKER_BUILD === '1'
      ? ['compose', '--env-file', '.env.docker', '--profile', 'full', 'up', '-d']
      : ['compose', '--env-file', '.env.docker', '--profile', 'full', 'up', '-d', '--build'],
    cwd: root,
  },
  npmStep('docker-probe', 'docker:probe-health', root),
  npmStep('meeting-api-smoke', 'docker:meeting-api-smoke', root),
  npmStep('unit-wave-auth-db', 'test:unit:auth', root),
  npmStep('unit-database', 'test:unit:database', root),
  npmStep('unit-api', 'test:unit:api', root),
  npmStep('unit-security', 'test:unit:security', root),
  npmStep('unit-wave-appointments', 'test:unit:appointments', root),
  npmStep('unit-notifications', 'test:unit:notifications', root),
  npmStep('unit-workflows', 'test:unit:workflows', root),
  npmStep('unit-wave-clinical', 'test:unit:clinical', root),
  npmStep('unit-ai', 'test:unit:ai', root),
  npmStep('unit-wave-meeting', 'test:unit:meeting', root),
  npmStep('unit-meeting-acceptance', 'test:unit:meeting-acceptance', root),
  npmStep('meeting-contract', 'test:meeting-server:contract', root),
  npmStep('post-meeting-pipeline', 'test:post-meeting-pipeline', root),
  npmStep('security-hardening', 'test:security-hardening', root),
  npmStep('process-contracts', 'test:unit:process-contracts', root),
  npmStep('v5-contracts', 'test:unit:v5-contracts', root),
  npmStep('sonar-lint', 'sonar:lint', root),
  npmStep('security-scan', 'security:scan', root),
];

const { pass, results } = runSteps(steps, { failFast: false });
if (results.find((r) => r.name === 'docker-compose' && r.ok)) {
  spawnSync(isWin ? 'powershell' : 'sleep', isWin ? ['-Command', 'Start-Sleep -Seconds 15'] : ['15'], {
    stdio: 'inherit',
    shell: isWin,
  });
}
process.exit(pass ? 0 : 1);
