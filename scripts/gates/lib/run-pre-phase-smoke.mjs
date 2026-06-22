#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { npmStep, runSteps } from './run-step.mjs';
import { resetDatabaseBaseline } from '../../docker/e2eDockerCommon.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

/**
 * Pre-phase infra smoke: probe-health → meeting-api-smoke → DB baseline reset.
 * Blocks wasted E2E when Docker/env is unhealthy.
 * @returns {boolean}
 */
export function runPrePhaseSmoke() {
  console.log('\n═══ [pre-phase-smoke] ═══');
  const { pass } = runSteps(
    [
      npmStep('docker-probe', 'docker:probe-health', root),
      npmStep('meeting-api-smoke', 'docker:meeting-api-smoke', root),
    ],
    { failFast: true },
  );
  if (!pass) {
    console.error('❌ pre-phase-smoke failed — fix Docker/env before E2E');
    return false;
  }
  resetDatabaseBaseline();
  console.log('✅ pre-phase-smoke passed');
  return true;
}
