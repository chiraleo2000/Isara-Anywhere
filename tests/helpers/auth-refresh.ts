/**
 * Refresh Playwright storageState files via API login.
 * Prevents 401s when global-setup tokens are stale or invalidated by concurrent logins.
 */
import { request as playwrightRequest } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { AUTH_CACHE_PATH, STORAGE_STATE_DIR } from './auth-paths';

const IS_CLOUD = process.env.TEST_ENV === 'cloud';
const PATIENT_URL = IS_CLOUD
  ? (process.env.CLOUD_PATIENT_URL || 'https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app')
  : (process.env.PATIENT_URL || process.env.PATIENT_PORTAL_URL || process.env.LOCAL_PATIENT_URL || 'http://127.0.0.1:3005');
const DOCTOR_URL = IS_CLOUD
  ? (process.env.CLOUD_DOCTOR_URL || 'https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app')
  : (process.env.DOCTOR_URL || process.env.DOCTOR_PORTAL_URL || process.env.LOCAL_DOCTOR_URL || 'http://127.0.0.1:3010');

export const AUTH_STORAGE_DIR = STORAGE_STATE_DIR;

/** Playwright storageState is origin-scoped; localhost and 127.0.0.1 do not share localStorage. */
function storageOriginsFor(primary: string): string[] {
  const origins = new Set<string>([primary]);
  try {
    const u = new URL(primary);
    if (u.hostname === 'localhost') {
      u.hostname = '127.0.0.1';
      origins.add(u.origin);
    } else if (u.hostname === '127.0.0.1') {
      u.hostname = 'localhost';
      origins.add(u.origin);
    }
  } catch {
    /* keep primary only */
  }
  return [...origins];
}


const USERS = {
  patient1: {
    email: process.env.TEST_PATIENT1_EMAIL || 'demo.test@gmail.com',
    password: process.env.TEST_PATIENT_PASSWORD || 'P@ssw0rd', // NOSONAR S2068
    id: 'PATIENT-DEMO',
    name: 'Demo Test Patient',
    role: 'patient1',
  },
  doctor: {
    email: process.env.TEST_DOCTOR_EMAIL || 'doctor.test@izara.com',
    password: process.env.TEST_DOCTOR_PASSWORD || 'IzaraDoctor@2024', // NOSONAR S2068
    id: 'DOC-TEST-001',
    name: 'Dr. Test Good',
    role: 'doctor',
  },
  admin: {
    email: process.env.TEST_ADMIN_EMAIL || 'admin.test@izara.com',
    password: process.env.TEST_ADMIN_PASSWORD || 'IzaraAdmin@2024', // NOSONAR S2068
    id: 'ADMIN-TEST-001',
    name: 'Dr. Admin Kind',
    role: 'admin',
  },
} as const;

type RoleKey = keyof typeof USERS;

async function apiLogin(
  ctx: Awaited<ReturnType<typeof playwrightRequest.newContext>>,
  baseUrl: string,
  creds: { email: string; password: string },
): Promise<{ token: string; refreshToken: string }> {
  const attempts = IS_CLOUD ? 4 : 6;
  for (let attempt = 0; attempt < attempts; attempt++) {
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
          if (token) {
            return {
              token,
              refreshToken: d.refreshToken || d.data?.refreshToken || '',
            };
          }
        }
      } catch {
        /* try next path or retry */
      }
    }
    if (attempt < attempts - 1) {
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
    }
  }
  return { token: '', refreshToken: '' };
}

function buildStorageState(
  role: RoleKey,
  token: string,
  u: (typeof USERS)[RoleKey],
  refreshToken = '',
): { cookies: []; origins: Array<{ origin: string; localStorage: Array<{ name: string; value: string }> }> } {
  const isDoctorPortal = role === 'doctor' || role === 'admin';
  const origin = isDoctorPortal ? DOCTOR_URL : PATIENT_URL;
  const now = Date.now();
  const localStorageEntries: Array<{ name: string; value: string }> = [];

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
          adminPrivileges:
            role === 'admin'
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
    if (refreshToken) {
      localStorageEntries.push({ name: 'izara_refresh_token', value: refreshToken });
    }
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

  return { cookies: [], origins: storageOriginsFor(origin).map((o) => ({ origin: o, localStorage: localStorageEntries })) };
}

let refreshInFlight: Promise<void> | null = null;
const roleRefreshInFlight: Partial<Record<RoleKey, Promise<void>>> = {};

function resolveTokenFromCache(role: RoleKey): string {
  if (!fs.existsSync(AUTH_CACHE_PATH)) return '';
  try {
    const cache = JSON.parse(fs.readFileSync(AUTH_CACHE_PATH, 'utf-8')) as {
      users?: Record<string, { token?: string }>;
    };
    return cache.users?.[role]?.token || '';
  } catch {
    return '';
  }
}

function writeStorageStateFile(role: RoleKey, token: string, refreshToken = ''): void {
  if (!fs.existsSync(AUTH_STORAGE_DIR)) {
    fs.mkdirSync(AUTH_STORAGE_DIR, { recursive: true });
  }
  const state = buildStorageState(role, token, USERS[role], refreshToken);
  const target = path.join(AUTH_STORAGE_DIR, `${role}.json`);
  const payload = JSON.stringify(state, null, 2);
  const fd = fs.openSync(target, 'w');
  try {
    fs.writeFileSync(fd, payload);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

async function refreshAuthStorageStateForRoleImpl(role: RoleKey): Promise<void> {
  const ctx = await playwrightRequest.newContext();
  try {
    const baseUrl = role === 'patient1' ? PATIENT_URL : DOCTOR_URL;
    let login = await apiLogin(ctx, baseUrl, USERS[role]);
    if (!login.token) {
      const cached = resolveTokenFromCache(role);
      login = { token: cached, refreshToken: '' };
    }
    if (!login.token) {
      console.warn(`  ? auth-refresh: ${role} login returned empty token`);
      return;
    }
    writeStorageStateFile(role, login.token, login.refreshToken);
  } finally {
    await ctx.dispose();
  }
}

/** Re-login a single E2E role — avoids invalidating other portal sessions on cloud. */
export async function refreshAuthStorageStateForRole(role: RoleKey): Promise<void> {
  if (!roleRefreshInFlight[role]) {
    roleRefreshInFlight[role] = refreshAuthStorageStateForRoleImpl(role).finally(() => {
      delete roleRefreshInFlight[role];
    });
  }
  return roleRefreshInFlight[role];
}

async function refreshAuthStorageStatesImpl(): Promise<void> {
  if (!fs.existsSync(AUTH_STORAGE_DIR)) {
    fs.mkdirSync(AUTH_STORAGE_DIR, { recursive: true });
  }

  const ctx = await playwrightRequest.newContext();
  try {
    const [p1, doc, adm] = await Promise.all([
      apiLogin(ctx, PATIENT_URL, USERS.patient1),
      apiLogin(ctx, DOCTOR_URL, USERS.doctor),
      apiLogin(ctx, DOCTOR_URL, USERS.admin),
    ]);

    const writes: Array<[RoleKey, { token: string; refreshToken: string }]> = [
      ['patient1', p1],
      ['doctor', doc],
      ['admin', adm],
    ];

    for (const [role, login] of writes) {
      const token = login.token || resolveTokenFromCache(role);
      if (!token) {
        console.warn('  warn auth-refresh: ' + role + ' login returned empty token');
        continue;
      }
      writeStorageStateFile(role, token, login.refreshToken || '');
    }
  } finally {
    await ctx.dispose();
  }
}

/** Re-login patient1 + doctor + admin and rewrite .auth-states/*.json (serialized). */
export async function refreshAuthStorageStates(): Promise<void> {
  if (!refreshInFlight) {
    refreshInFlight = refreshAuthStorageStatesImpl().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

/** Inject fresh tokens from storage files into an open page. */
export async function reinjectAuthFromStorageFile(
  page: import('@playwright/test').Page,
  role: 'patient1' | 'doctor' | 'admin',
): Promise<void> {
  const file = path.join(AUTH_STORAGE_DIR, `${role}.json`);

  const readState = (): { origins?: Array<{ localStorage?: Array<{ name: string; value: string }> }> } | null => {
    if (!fs.existsSync(file)) return null;
    try {
      const raw = fs.readFileSync(file, 'utf-8').trim();
      if (!raw) return null;
      return JSON.parse(raw) as { origins?: Array<{ localStorage?: Array<{ name: string; value: string }> }> };
    } catch {
      return null;
    }
  };

  let state = readState();
  if (!state) {
    await refreshAuthStorageStateForRole(role);
    state = readState();
  }
  if (!state) return;
  const items = state.origins?.[0]?.localStorage || [];

  let lastErr: unknown;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      if (page.isClosed()) return;
      await page.waitForLoadState('domcontentloaded', { timeout: 8_000 }).catch(() => {});
      if (page.isClosed()) return;
      await page.evaluate((entries: Array<{ name: string; value: string }>) => {
        for (const e of entries) localStorage.setItem(e.name, e.value);
        localStorage.setItem('izara_patient_last_activity', Date.now().toString());
        localStorage.setItem('izara_last_activity', Date.now().toString());
      }, items);
      return;
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      const closed = /Target page, context or browser has been closed/i.test(msg);
      // Teardown / viewport churn can close the page mid-reinject — treat as no-op.
      if (closed || page.isClosed()) return;
      const transient = /Execution context was destroyed|navigation/i.test(msg);
      if (!transient || attempt === 3) throw err;
      try {
        await page.waitForTimeout(400 * (attempt + 1));
      } catch {
        return;
      }
    }
  }
  throw lastErr;
}
