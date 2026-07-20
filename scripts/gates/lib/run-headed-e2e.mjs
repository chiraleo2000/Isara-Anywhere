#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { headedE2eEnv, runStep } from './run-step.mjs';
import { archiveFailure } from './archive-failure.mjs';
import { resolveGateWorkers } from './resolve-gate-workers.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../../..');

/**
 * @param {string[]} projects Playwright project names
 * @param {string} label step label
 * @param {{ phase?: number }} [opts]
 */
export function runHeadedE2e(projects, label = 'e2e-headed', opts = {}) {
  const reportPath = path.join(root, 'test-results', 'full-coverage-results.json');
  if (fs.existsSync(reportPath)) {
    fs.unlinkSync(reportPath);
  }
  const workers = resolveGateWorkers();
  const args = ['playwright', 'test', '--headed', `--workers=${workers}`, ...projects.flatMap((p) => ['--project', p])];
  const ok = runStep({
    name: label,
    cmd: 'npx',
    args,
    cwd: root,
    env: { ...headedE2eEnv, PW_WORKERS: workers },
  });
  if (!ok && opts.phase != null) {
    archiveFailure({ round: opts.phase, label });
  }
  return ok;
}
