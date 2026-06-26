#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const isWin = process.platform === 'win32';

/**
 * @param {{ name: string, cmd: string, args?: string[], cwd?: string, env?: Record<string, string> }} step
 */
export function runStep(step) {
  console.log(`\n═══ [${step.name}] ═══`);
  const args = step.args ?? [];
  const r = isWin
    ? spawnSync([step.cmd, ...args].join(' '), {
        cwd: step.cwd,
        stdio: 'inherit',
        shell: true,
        env: { ...process.env, ...step.env },
      })
    : spawnSync(step.cmd, args, {
        cwd: step.cwd,
        stdio: 'inherit',
        shell: false,
        env: { ...process.env, ...step.env },
      });
  const ok = r.status === 0;
  console.log(ok ? `✅ ${step.name} passed` : `❌ ${step.name} failed (exit ${r.status ?? 1})`);
  return ok;
}

/**
 * @param {Array<{ name: string, cmd: string, args?: string[], cwd?: string, env?: Record<string, string> }>} steps
 */
export function runSteps(steps, { failFast = true } = {}) {
  const results = [];
  for (const step of steps) {
    const ok = runStep(step);
    results.push({ name: step.name, ok });
    if (!ok && failFast) break;
  }
  return { results, pass: results.every((r) => r.ok) };
}

export function npmStep(name, script, cwd, env) {
  return { name, cmd: 'npm', args: ['run', script], cwd, env };
}

export const headedE2eEnv = {
  BASELINE_VISUAL: '1',
  PW_HEADED: '1',
  PW_WORKERS: '1',
  PW_SKIP_LIVE_GEMINI: '1',
  PW_ALLOW_RECORDING_SEED: '',
  PW_SKIP_FIREFOX_JROLE: '1',
  PW_SKIP_DEFECT_DM5: '1',
  PW_SKIP_DEFECT_DM6: '1',
  E2E_PRESERVE_WORKFLOW: '1',
  E2E_ALLOW_PARALLEL_SESSIONS: '1',
  E2E_LIGHT_FIXTURE: '1',
  PATIENT_URL: 'http://127.0.0.1:3005',
  DOCTOR_URL: 'http://127.0.0.1:3010',
  MEETING_URL: 'http://127.0.0.1:3020',
};
