/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * IZARA TELEMEDICINE — GLOBAL SETUP  (runs ONCE before ALL tests)
 * ═══════════════════════════════════════════════════════════════════════════════
 * Fast API-based auth for all 5 users.  Tokens are cached to a JSON file
 * so that individual spec beforeAll() hooks never hit the login endpoint again.
 * Browser tests inject the token into localStorage — no more UI logins.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import { request, FullConfig } from '@playwright/test';
import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  assertAuthTokensPresent,
  waitForPortalServices,
} from '../helpers/service-readiness';

// ── URLs ────────────────────────────────────────────────────────────────────
const IS_CLOUD = process.env.TEST_ENV === 'cloud';
const PATIENT_URL = IS_CLOUD
  ? (process.env.CLOUD_PATIENT_URL || 'https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app')
  : (process.env.LOCAL_PATIENT_URL || 'http://localhost:3005');
const DOCTOR_URL = IS_CLOUD
  ? (process.env.CLOUD_DOCTOR_URL || 'https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app')
  : (process.env.LOCAL_DOCTOR_URL || 'http://localhost:3010');
const MEETING_URL = IS_CLOUD
  ? (process.env.CLOUD_MEETING_URL || 'https://izara-meeting-server-dev-testing-724889190329.asia-southeast1.run.app')
  : (process.env.LOCAL_MEETING_URL || 'http://localhost:3020');

// ── Credentials ─────────────────────────────────────────────────────────────
const USERS = {
  patient1: { email: process.env.TEST_PATIENT1_EMAIL || 'demo.test@gmail.com', password: process.env.TEST_PATIENT_PASSWORD || 'P@ssw0rd', id: 'PATIENT-DEMO', name: 'Demo Test Patient' }, // NOSONAR S2068
  patient2: { email: process.env.TEST_PATIENT2_EMAIL || 'Somchai.Mankong@gmail.com', password: process.env.TEST_PATIENT_PASSWORD || 'P@ssw0rd', id: 'PATIENT-SOMCHAI', name: 'Somchai Mankong' }, // NOSONAR S2068
  patient3: { email: process.env.TEST_PATIENT3_EMAIL || 'Anan.Khayanrian@gmail.com', password: process.env.TEST_PATIENT_PASSWORD || 'P@ssw0rd', id: 'PATIENT-ANAN', name: 'Anan Khayanrian' }, // NOSONAR S2068
  doctor:   { email: process.env.TEST_DOCTOR_EMAIL || 'doctor.test@izara.com', password: process.env.TEST_DOCTOR_PASSWORD || 'IzaraDoctor@2024', id: 'DOC-TEST-001', name: 'Dr. Test Good' }, // NOSONAR S2068
  admin:    { email: process.env.TEST_ADMIN_EMAIL || 'admin.test@izara.com', password: process.env.TEST_ADMIN_PASSWORD || 'IzaraAdmin@2024', id: 'ADMIN-TEST-001', name: 'Dr. Admin Kind' }, // NOSONAR S2068
};

export const AUTH_CACHE_PATH = path.join(__dirname, '.auth-cache.json');
export const STORAGE_STATE_DIR = path.join(__dirname, '.auth-states');

export interface CachedAuth {
  timestamp: number;
  users: Record<string, { role: string; id: string; token: string; email: string; name: string; portalUrl: string }>;
}

// ── Quick API login (no browser needed) ─────────────────────────────────────
async function apiLogin(ctx: any, baseUrl: string, creds: { email: string; password: string }): Promise<string> {
  // Try both login paths the portals use
  for (const loginPath of ['/api/auth/login', '/auth/login']) {
    try {
      const res = await ctx.post(`${baseUrl}${loginPath}`, {
        data: { email: creds.email, password: creds.password },
        headers: { 'Content-Type': 'application/json' },
        timeout: IS_CLOUD ? 30_000 : 15_000,
      });
      if (res.status() === 200) {
        const d = await res.json();
        const token = d.token || d.accessToken || d.data?.token || '';
        if (token) return token;
      }
    } catch { /* try next path */ }
  }
  return '';
}

// ── SSO test seam: fixture JSON idTokens for Group N API tests ───────────────
// Local: always on. Cloud dev-testing (*-dev-testing Cloud Run): server must
// expose IZARA_DEV_TESTING=1 + GOOGLE_TOKEN_VERIFIER_FIXTURE=1 (see cloudbuild.yaml).
if (!process.env.GOOGLE_TOKEN_VERIFIER_FIXTURE) {
  process.env.GOOGLE_TOKEN_VERIFIER_FIXTURE = '1';
  console.log(`  🔑 GOOGLE_TOKEN_VERIFIER_FIXTURE=1 (${IS_CLOUD ? 'cloud dev-testing' : 'local'})`);
}

const PORTAL_SERVICES = [
  { name: 'Patient Portal', baseUrl: PATIENT_URL, healthPath: '/health' },
  { name: 'Doctor Portal', baseUrl: DOCTOR_URL, healthPath: '/health' },
  { name: 'Meeting Server', baseUrl: MEETING_URL, healthPath: '/health' },
];

/** Apply idempotent SQL migrations on existing Docker Postgres (init scripts only run once). */
function ensureLocalDbMigrations(): void {
  if (IS_CLOUD || process.env.E2E_SKIP_DB_MIGRATE === '1') return;
  const migrationDir = path.join(__dirname, '../../scripts/database/migrations');
  const files = [
    '2025-add-google-sub.sql',
    '2025-ensure-appointment-columns.sql',
  ];
  for (const file of files) {
    const migrationPath = path.join(migrationDir, file);
    if (!fs.existsSync(migrationPath)) continue;
    try {
      execSync('docker exec -i izara-postgres psql -U postgres -d izara_phase1 -v ON_ERROR_STOP=1', {
        input: fs.readFileSync(migrationPath),
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 15_000,
      });
      console.log(`  ✅ DB migration: ${file}`);
    } catch (err) {
      console.warn(`  ⚠️  DB migration skipped (${file}):`, (err as Error).message?.slice(0, 120));
    }
  }
}

// ── Main ────────────────────────────────────────────────────────────────────
async function globalSetup(_config: FullConfig) {
  console.log('\n🔐 GLOBAL SETUP — Authenticating all 5 users via API (ONE time)...');
  const t0 = Date.now();

  const ctx = await request.newContext();

  try {
    console.log('  ⏳ Waiting for portal services (health probes)...');
    const maxAttempts = IS_CLOUD ? 20 : 15;
    const { ready, failed } = await waitForPortalServices(ctx, PORTAL_SERVICES, {
      maxAttempts,
      strict: process.env.E2E_SKIP_HEALTH_GATE !== '1',
    });
    console.log(`  ✅ Ready: ${ready.join(', ') || 'none'}`);
    if (failed.length) console.warn(`  ⚠️  Not ready: ${failed.join(', ')}`);

    ensureLocalDbMigrations();

    // All 5 logins in parallel — FAST
    const [p1, p2, p3, doc, adm] = await Promise.all([
      apiLogin(ctx, PATIENT_URL, USERS.patient1),
      apiLogin(ctx, PATIENT_URL, USERS.patient2),
      apiLogin(ctx, PATIENT_URL, USERS.patient3),
      apiLogin(ctx, DOCTOR_URL, USERS.doctor),
      apiLogin(ctx, DOCTOR_URL, USERS.admin),
    ]);

    const cache: CachedAuth = {
      timestamp: Date.now(),
      users: {
        patient1: { role: 'patient1', id: USERS.patient1.id, token: p1, email: USERS.patient1.email, name: USERS.patient1.name, portalUrl: PATIENT_URL },
        patient2: { role: 'patient2', id: USERS.patient2.id, token: p2, email: USERS.patient2.email, name: USERS.patient2.name, portalUrl: PATIENT_URL },
        patient3: { role: 'patient3', id: USERS.patient3.id, token: p3, email: USERS.patient3.email, name: USERS.patient3.name, portalUrl: PATIENT_URL },
        doctor:   { role: 'doctor',   id: USERS.doctor.id,   token: doc, email: USERS.doctor.email,  name: USERS.doctor.name,  portalUrl: DOCTOR_URL },
        admin:    { role: 'admin',    id: USERS.admin.id,    token: adm, email: USERS.admin.email,   name: USERS.admin.name,   portalUrl: DOCTOR_URL },
      },
    };

    // Ensure directories exist
    const dir = path.dirname(AUTH_CACHE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(STORAGE_STATE_DIR)) fs.mkdirSync(STORAGE_STATE_DIR, { recursive: true });
    fs.writeFileSync(AUTH_CACHE_PATH, JSON.stringify(cache, null, 2));

    // ── Write Playwright storageState files per role ───────────────────
    // These let specs use test.use({ storageState }) so pages start
    // pre-authenticated with ZERO login navigation.
    for (const [role, u] of Object.entries(cache.users)) {
      const isDoctorPortal = role === 'doctor' || role === 'admin';
      const origin = isDoctorPortal ? DOCTOR_URL : PATIENT_URL;
      const now = Date.now();

      const localStorageEntries: { name: string; value: string }[] = [];
      if (isDoctorPortal) {
        localStorageEntries.push(
          { name: 'token', value: u.token },
          { name: 'izara_current_user', value: JSON.stringify({
            id: u.id, email: u.email, name: u.name, displayName: u.name, role: u.role,
            doctorId: u.id, medicalLicenseNumber: 'TEST-LIC-001',
            isActive: true, emailVerified: true,
            isAdmin: role === 'admin',
            adminPrivileges: role === 'admin'
              ? { manageDoctors: true, manageAppointments: true, viewAllRecords: true, manageContent: true, systemSettings: true }
              : undefined,
            preferences: { theme: 'light', language: 'th', notifications: { email: true, push: true, sms: false } },
          }) },
          { name: 'izara_session_expiry', value: (now + 7200000).toString() }, // 2 hours
          { name: 'izara_last_activity', value: now.toString() },
        );
      } else {
        localStorageEntries.push(
          { name: 'auth_token', value: u.token },
          { name: 'izara_user', value: JSON.stringify({ id: u.id, email: u.email, name: u.name, role: u.role }) },
          { name: 'izara_patient_last_activity', value: now.toString() },
        );
      }
      // Generic keys for components that read them directly
      localStorageEntries.push(
        { name: 'izara_auth_token', value: u.token },
        { name: 'user', value: JSON.stringify({ email: u.email, name: u.name, id: u.id, role: u.role, token: u.token }) },
      );

      const storageState = {
        cookies: [],
        origins: [{ origin, localStorage: localStorageEntries }],
      };
      fs.writeFileSync(
        path.join(STORAGE_STATE_DIR, `${role}.json`),
        JSON.stringify(storageState, null, 2),
      );
    }

    const tokens = { patient1: p1, patient2: p2, patient3: p3, doctor: doc, admin: adm };
    assertAuthTokensPresent(tokens, ['patient1', 'doctor', 'admin']);

    const ok = (t: string) => t ? '✅' : '❌';
    console.log(`   ${ok(p1)} patient1 | ${ok(p2)} patient2 | ${ok(p3)} patient3 | ${ok(doc)} doctor | ${ok(adm)} admin`);
    console.log(`   Done in ${Date.now() - t0}ms — tokens + storageState cached\n`);
  } finally {
    await ctx.dispose();
  }
}

export default globalSetup;
