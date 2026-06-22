/**

 * Shared helpers for Playwright E2E against local Docker stack.

 * Health probes run on the host OS — use 127.0.0.1, not host.docker.internal.

 */

import { spawnSync } from 'node:child_process';

import fs from 'node:fs';

import path from 'node:path';

import { fileURLToPath } from 'node:url';



const __dirname = path.dirname(fileURLToPath(import.meta.url));

const probeScript = path.join(__dirname, 'probe-health.mjs');



export const repoRoot = path.resolve(__dirname, '../..');

export const composeFile = path.join(repoRoot, 'docker-compose.yml');

export const envFile = path.join(repoRoot, '.env.docker');

export const playwrightImage = process.env.PLAYWRIGHT_DOCKER_IMAGE || 'mcr.microsoft.com/playwright:v1.58.2-jammy';



export const portalHost = 'host.docker.internal';



export const composeBase = ['compose', '-f', composeFile, '--env-file', envFile];



export function playwrightPortalUrls() {

  return {

    patient: process.env.LOCAL_PATIENT_URL || `http://${portalHost}:3005`,

    doctor: process.env.LOCAL_DOCTOR_URL || `http://${portalHost}:3010`,

    meeting: process.env.LOCAL_MEETING_URL || `http://${portalHost}:3020`,

  };

}



export function hostHealthUrls(includeMeeting = false) {

  const urls = [

    process.env.HEALTH_DOCTOR_URL || 'http://127.0.0.1:3010',

    process.env.HEALTH_PATIENT_URL || 'http://127.0.0.1:3005',

  ];

  if (includeMeeting) {

    urls.push(process.env.HEALTH_MEETING_URL || 'http://127.0.0.1:3020');

  }

  return urls;

}



export function waitForPortalHealth(root = repoRoot, { includeMeeting = false, timeoutMs = 300_000 } = {}) {

  const urls = hostHealthUrls(includeMeeting);

  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {

    const probe = spawnSync('node', [probeScript, ...urls], {

      cwd: root,

      stdio: 'ignore',

      shell: false,

    });

    if (probe.status === 0) return true;

    spawnSync('node', ['-e', 'setTimeout(()=>{}, 5000)'], { stdio: 'ignore' });

  }

  return false;

}



export function run(cmd, args, opts = {}) {

  console.log(`\n> ${cmd} ${args.join(' ')}`);

  const result = spawnSync(cmd, args, {

    cwd: repoRoot,

    stdio: 'inherit',

    shell: false,

    ...opts,

  });

  if (result.error) {

    console.error(`[e2e-docker] Failed: ${result.error.message}`);

    process.exit(1);

  }

  if (result.status !== 0) process.exit(result.status ?? 1);

}



export function runCapture(cmd, args) {

  return spawnSync(cmd, args, {

    cwd: repoRoot,

    encoding: 'utf8',

    shell: false,

  });

}



export function workspaceMount() {

  return process.platform === 'win32'

    ? `${repoRoot.replaceAll('\\', '/')}:/workspace`

    : `${repoRoot}:/workspace`;

}



export function playwrightEnvVars() {

  const { patient, doctor, meeting } = playwrightPortalUrls();

  return {

    LOCAL_PATIENT_URL: patient,

    LOCAL_DOCTOR_URL: doctor,

    LOCAL_MEETING_URL: meeting,

    // Docker Playwright image has no X server — headed mode must run on the host OS.
    PW_HEADLESS: '1',
    PW_WORKERS: '1',

    TEST_DOCTOR_PASSWORD: process.env.TEST_DOCTOR_PASSWORD || 'IzaraDoctor@2024', // NOSONAR S2068 — E2E fixture default; override via env in CI

    TEST_ADMIN_PASSWORD: process.env.TEST_ADMIN_PASSWORD || 'IzaraAdmin@2024', // NOSONAR S2068 — E2E fixture default; override via env in CI

    TEST_PATIENT_PASSWORD: process.env.TEST_PATIENT_PASSWORD || 'P@ssw0rd', // NOSONAR S2068 — E2E fixture default; override via env in CI

  };

}



export function dockerRunPrefix(extraEnv = {}) {

  const env = { ...playwrightEnvVars(), ...extraEnv };

  const prefix = [

    'run', '--rm',

    '--add-host', 'host.docker.internal:host-gateway',

    '--shm-size=2g',

    '-v', workspaceMount(),

    '-w', '/workspace',

  ];

  for (const [key, value] of Object.entries(env)) {

    prefix.push('-e', `${key}=${value}`);

  }

  return prefix;

}



export function waitForPostgresReady(timeoutMs = 180_000) {

  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {

    const probe = runCapture('docker', ['exec', 'izara-postgres', 'pg_isready', '-U', 'postgres', '-d', 'izara_phase1']);

    if (probe.status === 0) return true;

    spawnSync('node', ['-e', 'setTimeout(()=>{}, 3000)'], { stdio: 'ignore' });

  }

  return false;

}



export function resetDatabaseBaseline() {

  console.log('\n[e2e-docker] Resetting database to clean baseline…');

  // Drop stale D→E→F workflow ids when DB is wiped (prevents D4 confirm 404).
  try {
    const workflowStatePath = path.join(repoRoot, 'tests', 'e2e', '.workflow-state.json');
    if (fs.existsSync(workflowStatePath)) {
      fs.unlinkSync(workflowStatePath);
      console.log('[e2e-docker] Cleared tests/e2e/.workflow-state.json');
    }
  } catch (err) {
    console.warn('[e2e-docker] Could not clear workflow state:', err?.message || err);
  }

  const cleanupSql = path.join(repoRoot, 'scripts', 'database', 'cleanup-test-data.sql');

  const seedSql = path.join(repoRoot, 'scripts', 'database', 'seed-dev-data.sql');

  for (const sqlFile of [cleanupSql, seedSql]) {

    const result = spawnSync(

      'docker',

      ['exec', '-i', 'izara-postgres', 'psql', '-U', 'postgres', '-d', 'izara_phase1', '-v', 'ON_ERROR_STOP=1'],

      { cwd: repoRoot, input: fs.readFileSync(sqlFile), stdio: ['pipe', 'inherit', 'inherit'] },

    );

    if (result.status !== 0) {

      console.error(`[e2e-docker] DB reset failed while applying ${path.basename(sqlFile)}`);

      process.exit(result.status ?? 1);

    }

  }

  console.log('[e2e-docker] Database baseline restored (cleanup + seed).');

}



/**

 * Run Playwright inside the official browser container.

 * @param {{ projects: string; extraEnv?: Record<string, string>; preCommand?: string }} opts

 */

export function runPlaywrightInDocker({
  projects,
  extraEnv = {},
  preCommand = 'test -d node_modules/.bin/playwright || npm ci',
}) {

  const cmd = preCommand

    ? `${preCommand} && npx playwright test ${projects} --workers=1`

    : `npx playwright test ${projects} --workers=1`;

  run('docker', [

    ...dockerRunPrefix(extraEnv),

    playwrightImage,

    'sh', '-c', cmd,

  ]);

}


