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



const E2E_AUTH_USERS = {
  patient1: {
    email: process.env.TEST_PATIENT1_EMAIL || 'demo.test@gmail.com',
    password: process.env.TEST_PATIENT_PASSWORD || 'P@ssw0rd',
    id: 'PATIENT-DEMO',
    name: 'Demo Test Patient',
    role: 'patient1',
  },
  doctor: {
    email: process.env.TEST_DOCTOR_EMAIL || 'doctor.test@izara.com',
    password: process.env.TEST_DOCTOR_PASSWORD || 'IzaraDoctor@2024', // NOSONAR S2068 — E2E fixture default; override via env in CI
    id: 'DOC-TEST-001',
    name: 'Dr. Test Good',
    role: 'doctor',
  },
  admin: {
    email: process.env.TEST_ADMIN_EMAIL || 'admin.test@izara.com',
    password: process.env.TEST_ADMIN_PASSWORD || 'IzaraAdmin@2024', // NOSONAR S2068 — E2E fixture default; override via env in CI
    id: 'ADMIN-TEST-001',
    name: 'Dr. Admin Kind',
    role: 'admin',
  },
};

function e2ePortalUrls() {
  const isCloud = process.env.TEST_ENV === 'cloud';
  return {
    patientUrl: isCloud
      ? (process.env.CLOUD_PATIENT_URL || 'https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app')
      : (process.env.LOCAL_PATIENT_URL || process.env.PATIENT_URL || 'http://127.0.0.1:3005'),
    doctorUrl: isCloud
      ? (process.env.CLOUD_DOCTOR_URL || 'https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app')
      : (process.env.LOCAL_DOCTOR_URL || process.env.DOCTOR_URL || 'http://127.0.0.1:3010'),
  };
}

async function tryLoginAtPath(baseUrl, loginPath, creds) {
  const isCloud = process.env.TEST_ENV === 'cloud';
  try {
    const res = await fetch(`${baseUrl}${loginPath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: creds.email, password: creds.password }),
      signal: AbortSignal.timeout(isCloud ? 30_000 : 15_000),
    });
    if (res.status !== 200) return '';
    const data = await res.json();
    return data.token || data.accessToken || data.data?.token || '';
  } catch {
    return '';
  }
}

async function apiLoginFetch(baseUrl, creds) {
  const attempts = process.env.TEST_ENV === 'cloud' ? 4 : 6;
  const loginPaths = ['/api/auth/login', '/auth/login'];
  for (let attempt = 0; attempt < attempts; attempt++) {
    for (const loginPath of loginPaths) {
      const token = await tryLoginAtPath(baseUrl, loginPath, creds);
      if (token) return token;
    }
    if (attempt < attempts - 1) {
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
    }
  }
  return '';
}

function buildE2eStorageState(role, token, u, origin) {
  const now = Date.now();
  const localStorageEntries = [];
  const isDoctorPortal = role === 'doctor' || role === 'admin';
  if (isDoctorPortal) {
    localStorageEntries.push(
      { name: 'token', value: token },
      {
        name: 'izara_current_user',
        value: JSON.stringify({
          id: u.id,
          email: u.email,
          name: u.name,
          displayName: u.name,
          role: u.role,
          doctorId: u.id,
          medicalLicenseNumber: 'TEST-LIC-001',
          isActive: true,
          emailVerified: true,
          isAdmin: role === 'admin',
          adminPrivileges: role === 'admin'
            ? {
                manageDoctors: true,
                manageAppointments: true,
                viewAllRecords: true,
                manageContent: true,
                systemSettings: true,
              }
            : undefined,
          preferences: { theme: 'light', language: 'th', notifications: { email: true, push: true, sms: false } },
        }),
      },
      { name: 'izara_session_expiry', value: (now + 7_200_000).toString() },
      { name: 'izara_last_activity', value: now.toString() },
    );
  } else {
    localStorageEntries.push(
      { name: 'auth_token', value: token },
      { name: 'izara_user', value: JSON.stringify({ id: u.id, email: u.email, name: u.name, role: 'patient' }) },
      { name: 'izara_patient_last_activity', value: now.toString() },
    );
  }
  localStorageEntries.push(
    { name: 'izara_auth_token', value: token },
    { name: 'user', value: JSON.stringify({ email: u.email, name: u.name, id: u.id, role: u.role, token }) },
  );
  return { cookies: [], origins: [{ origin, localStorage: localStorageEntries }] };
}

/** Re-login E2E users after DB reset (DELETE FROM sessions invalidates cached tokens). */
export async function refreshE2eAuthAfterDbReset() {
  const { patientUrl, doctorUrl } = e2ePortalUrls();
  const authCachePath = path.join(repoRoot, 'tests', 'e2e', '.auth-cache.json');
  const storageDir = path.join(repoRoot, 'tests', 'e2e', '.auth-states');
  if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true });

  const [p1, doc, adm] = await Promise.all([
    apiLoginFetch(patientUrl, E2E_AUTH_USERS.patient1),
    apiLoginFetch(doctorUrl, E2E_AUTH_USERS.doctor),
    apiLoginFetch(doctorUrl, E2E_AUTH_USERS.admin),
  ]);

  const cache = {
    timestamp: Date.now(),
    users: {
      patient1: { role: 'patient1', id: E2E_AUTH_USERS.patient1.id, token: p1, email: E2E_AUTH_USERS.patient1.email, name: E2E_AUTH_USERS.patient1.name, portalUrl: patientUrl },
      doctor: { role: 'doctor', id: E2E_AUTH_USERS.doctor.id, token: doc, email: E2E_AUTH_USERS.doctor.email, name: E2E_AUTH_USERS.doctor.name, portalUrl: doctorUrl },
      admin: { role: 'admin', id: E2E_AUTH_USERS.admin.id, token: adm, email: E2E_AUTH_USERS.admin.email, name: E2E_AUTH_USERS.admin.name, portalUrl: doctorUrl },
    },
  };
  fs.writeFileSync(authCachePath, JSON.stringify(cache, null, 2));

  for (const [role, token] of [['patient1', p1], ['doctor', doc], ['admin', adm]]) {
    if (!token) {
      console.warn(`[e2e-docker] auth refresh: ${role} login returned empty token`);
      continue;
    }
    const u = E2E_AUTH_USERS[role];
    const origin = role === 'patient1' ? patientUrl : doctorUrl;
    const state = buildE2eStorageState(role, token, u, origin);
    fs.writeFileSync(path.join(storageDir, `${role}.json`), JSON.stringify(state, null, 2));
  }
  console.log('[e2e-docker] E2E auth storage refreshed after DB reset.');
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
  const ssoSeedSql = path.join(repoRoot, 'scripts', 'database', 'seed-sso-test-users.sql');
  const contentWorkflowSql = path.join(repoRoot, 'scripts', 'database', 'migrations', 'v2.3.1-content-workflow-columns.sql');

  for (const sqlFile of [cleanupSql, seedSql, ssoSeedSql, contentWorkflowSql]) {

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

  const refreshResult = spawnSync(
    process.execPath,
    [path.join(__dirname, 'refresh-e2e-auth.mjs')],
    { cwd: repoRoot, stdio: 'inherit', env: process.env },
  );
  if (refreshResult.status !== 0) {
    console.warn('[e2e-docker] Auth refresh after DB reset failed (exit', refreshResult.status, ')');
  }

}



/** Restart meeting-server container after heavy unit/socket tests (prevents hung save-recording during headed E2E). */
export function restartMeetingServerForE2e() {
  console.log('[e2e-docker] Restarting meeting-server for headed E2E...');
  const result = spawnSync('docker', ['restart', 'izara-meeting-server'], {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) {
    console.warn('[e2e-docker] meeting-server restart failed (exit', result.status, ')');
    return false;
  }
  const waitMs = 12_000;
  console.log(`[e2e-docker] Waiting ${waitMs / 1000}s for meeting-server health...`);
  const deadline = Date.now() + waitMs;
  while (Date.now() < deadline) {
    const probe = spawnSync(process.execPath, [probeScript, 'http://127.0.0.1:3020'], {
      cwd: repoRoot,
      stdio: 'pipe',
      encoding: 'utf8',
    });
    if (probe.status === 0) {
      console.log('[e2e-docker] meeting-server healthy after restart.');
      return true;
    }
    const napUntil = Date.now() + 2_000;
    while (Date.now() < napUntil) { /* wait for container */ }
  }
  console.warn('[e2e-docker] meeting-server health probe slow after restart — proceeding anyway');
  return true;
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


