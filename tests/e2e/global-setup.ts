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
import * as fs from 'fs';
import * as path from 'path';

// ── URLs ────────────────────────────────────────────────────────────────────
const IS_CLOUD = process.env.TEST_ENV === 'cloud';
const PATIENT_URL = IS_CLOUD
  ? (process.env.CLOUD_PATIENT_URL || 'https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app')
  : (process.env.LOCAL_PATIENT_URL || 'http://localhost:3005');
const DOCTOR_URL = IS_CLOUD
  ? (process.env.CLOUD_DOCTOR_URL || 'https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app')
  : (process.env.LOCAL_DOCTOR_URL || 'http://localhost:3010');

// ── Credentials ─────────────────────────────────────────────────────────────
const USERS = {
  patient1: { email: process.env.TEST_PATIENT1_EMAIL || 'demo.test@gmail.com', password: process.env.TEST_PATIENT_PASSWORD || 'P@ssw0rd', id: 'PATIENT-DEMO', name: 'Demo Test Patient' },
  patient2: { email: process.env.TEST_PATIENT2_EMAIL || 'Somchai.Mankong@gmail.com', password: process.env.TEST_PATIENT_PASSWORD || 'P@ssw0rd', id: 'PATIENT-SOMCHAI', name: 'Somchai Mankong' },
  patient3: { email: process.env.TEST_PATIENT3_EMAIL || 'Anan.Khayanrian@gmail.com', password: process.env.TEST_PATIENT_PASSWORD || 'P@ssw0rd', id: 'PATIENT-ANAN', name: 'Anan Khayanrian' },
  doctor:   { email: process.env.TEST_DOCTOR_EMAIL || 'doctor.test@izara.com', password: process.env.TEST_DOCTOR_PASSWORD || 'IzaraDoctor@2024', id: 'DOC-TEST-001', name: 'Dr. Test Good' },
  admin:    { email: process.env.TEST_ADMIN_EMAIL || 'admin.test@izara.com', password: process.env.TEST_ADMIN_PASSWORD || 'IzaraAdmin@2024', id: 'ADMIN-TEST-001', name: 'Dr. Admin Kind' },
};

export const AUTH_CACHE_PATH = path.join(__dirname, '.auth-cache.json');

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

// ── Main ────────────────────────────────────────────────────────────────────
async function globalSetup(_config: FullConfig) {
  console.log('\n🔐 GLOBAL SETUP — Authenticating all 5 users via API (ONE time)...');
  const t0 = Date.now();

  const ctx = await request.newContext();

  try {
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

    // Ensure directory exists
    const dir = path.dirname(AUTH_CACHE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(AUTH_CACHE_PATH, JSON.stringify(cache, null, 2));

    const ok = (t: string) => t ? '✅' : '❌';
    console.log(`   ${ok(p1)} patient1 | ${ok(p2)} patient2 | ${ok(p3)} patient3 | ${ok(doc)} doctor | ${ok(adm)} admin`);
    console.log(`   Done in ${Date.now() - t0}ms — tokens cached to .auth-cache.json\n`);
  } finally {
    await ctx.dispose();
  }
}

export default globalSetup;
