/**
 * ═══════════════════════════════════════════════════════════════════════
 * Global Setup Logic — Unit Tests
 * ═══════════════════════════════════════════════════════════════════════
 * Tests: Warmup backoff strategy, login fallback paths, storage state
 *        generation, auth cache format, credential configuration
 */
import { describe, it, expect } from 'vitest';

// ── Warmup Backoff Logic (mirrors global-setup.ts) ────────────────────

function getWarmupDelay(attempt: number): number {
  if (attempt <= 2) return 3_000;
  if (attempt <= 4) return 5_000;
  return 8_000;
}

function shouldContinueWarmup(attempt: number, maxRetries: number): boolean {
  return attempt <= maxRetries;
}

// ── Login Path Resolution ─────────────────────────────────────────────

const LOGIN_PATHS = ['/api/auth/login', '/auth/login'];

function resolveLoginUrl(baseUrl: string, pathIndex: number): string {
  return `${baseUrl}${LOGIN_PATHS[pathIndex]}`;
}

// ── Token Extraction (mirrors apiLogin result parsing) ─────────────────

function extractToken(responseData: Record<string, unknown>): string {
  const d = responseData;
  const token = (d.token || d.accessToken || (d.data as Record<string, unknown>)?.token || '') as string;
  return token;
}

// ── Storage State Generation ──────────────────────────────────────────

interface UserInfo {
  id: string;
  email: string;
  name: string;
  role: string;
  token: string;
}

function buildLocalStorageEntries(
  user: UserInfo,
  isDoctorPortal: boolean,
  isAdmin: boolean
): { name: string; value: string }[] {
  const entries: { name: string; value: string }[] = [];
  const now = Date.now();

  if (isDoctorPortal) {
    entries.push(
      { name: 'token', value: user.token },
      { name: 'izara_current_user', value: JSON.stringify({
        id: user.id, email: user.email, name: user.name, displayName: user.name,
        role: user.role, doctorId: user.id, medicalLicenseNumber: 'TEST-LIC-001',
        isActive: true, emailVerified: true, isAdmin,
        adminPrivileges: isAdmin
          ? { manageDoctors: true, manageAppointments: true, viewAllRecords: true, manageContent: true, systemSettings: true }
          : undefined,
        preferences: { theme: 'light', language: 'th', notifications: { email: true, push: true, sms: false } },
      }) },
      { name: 'izara_session_expiry', value: (now + 7200000).toString() },
      { name: 'izara_last_activity', value: now.toString() },
    );
  } else {
    entries.push(
      { name: 'auth_token', value: user.token },
      { name: 'izara_user', value: JSON.stringify({ id: user.id, email: user.email, name: user.name, role: user.role }) },
      { name: 'izara_patient_last_activity', value: now.toString() },
    );
  }

  // Generic keys
  entries.push(
    { name: 'izara_auth_token', value: user.token },
    { name: 'user', value: JSON.stringify({ email: user.email, name: user.name, id: user.id, role: user.role, token: user.token }) },
  );

  return entries;
}

function buildStorageState(origin: string, entries: { name: string; value: string }[]) {
  return {
    cookies: [],
    origins: [{ origin, localStorage: entries }],
  };
}

// ── Auth Cache Structure ──────────────────────────────────────────────

interface CachedAuth {
  timestamp: number;
  users: Record<string, { role: string; id: string; token: string; email: string; name: string; portalUrl: string }>;
}

function buildAuthCache(users: Record<string, UserInfo & { portalUrl: string }>): CachedAuth {
  return {
    timestamp: Date.now(),
    users: Object.fromEntries(
      Object.entries(users).map(([key, u]) => [key, {
        role: u.role, id: u.id, token: u.token, email: u.email, name: u.name, portalUrl: u.portalUrl,
      }])
    ),
  };
}

// ── Credential Defaults ───────────────────────────────────────────────

const DEFAULT_CREDENTIALS = {
  patient1: { email: 'demo.test@gmail.com', password: 'P@ssw0rd', id: 'PATIENT-DEMO' },
  patient2: { email: 'Somchai.Mankong@gmail.com', password: 'P@ssw0rd', id: 'PATIENT-SOMCHAI' },
  patient3: { email: 'Anan.Khayanrian@gmail.com', password: 'P@ssw0rd', id: 'PATIENT-ANAN' },
  doctor: { email: 'doctor.test@izara.com', password: 'IzaraDoctor@2024', id: 'DOC-TEST-001' },
  admin: { email: 'admin.test@izara.com', password: 'IzaraAdmin@2024', id: 'ADMIN-TEST-001' },
};

// ═══════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════

describe('Global Setup Logic', () => {

  // ── A — Warmup Backoff Strategy ───────────────────────────────────────
  describe('A — Warmup Backoff Strategy', () => {
    it('A01 — attempt 1 has 3s delay', () => {
      expect(getWarmupDelay(1)).toBe(3_000);
    });

    it('A02 — attempt 2 has 3s delay', () => {
      expect(getWarmupDelay(2)).toBe(3_000);
    });

    it('A03 — attempt 3 escalates to 5s', () => {
      expect(getWarmupDelay(3)).toBe(5_000);
    });

    it('A04 — attempt 4 stays at 5s', () => {
      expect(getWarmupDelay(4)).toBe(5_000);
    });

    it('A05 — attempt 5+ escalates to 8s', () => {
      expect(getWarmupDelay(5)).toBe(8_000);
      expect(getWarmupDelay(10)).toBe(8_000);
    });

    it('A06 — total max wait is bounded (10 retries)', () => {
      let total = 0;
      for (let i = 1; i <= 10; i++) total += getWarmupDelay(i);
      // 3+3+5+5+8+8+8+8+8+8 = 64s
      expect(total).toBe(64_000);
      expect(total).toBeLessThan(120_000); // Always under 2 minutes
    });
  });

  // ── B — Retry Control ────────────────────────────────────────────────
  describe('B — Retry Control', () => {
    it('B01 — attempt 1 of 10 continues', () => {
      expect(shouldContinueWarmup(1, 10)).toBe(true);
    });

    it('B02 — attempt 10 of 10 continues (last attempt)', () => {
      expect(shouldContinueWarmup(10, 10)).toBe(true);
    });

    it('B03 — attempt 11 of 10 stops', () => {
      expect(shouldContinueWarmup(11, 10)).toBe(false);
    });

    it('B04 — custom max retries respected', () => {
      expect(shouldContinueWarmup(5, 5)).toBe(true);
      expect(shouldContinueWarmup(6, 5)).toBe(false);
    });
  });

  // ── C — Login Path Resolution ─────────────────────────────────────────
  describe('C — Login Path Resolution', () => {
    it('C01 — first path is /api/auth/login', () => {
      expect(resolveLoginUrl('http://localhost:3005', 0)).toBe('http://localhost:3005/api/auth/login');
    });

    it('C02 — second path is /auth/login', () => {
      expect(resolveLoginUrl('http://localhost:3010', 1)).toBe('http://localhost:3010/auth/login');
    });

    it('C03 — cloud base URL works', () => {
      expect(resolveLoginUrl('https://izara.run.app', 0)).toBe('https://izara.run.app/api/auth/login');
    });

    it('C04 — login paths array has exactly 2 entries', () => {
      expect(LOGIN_PATHS).toHaveLength(2);
    });
  });

  // ── D — Token Extraction ──────────────────────────────────────────────
  describe('D — Token Extraction', () => {
    it('D01 — extracts from .token', () => {
      expect(extractToken({ token: 'jwt-abc' })).toBe('jwt-abc');
    });

    it('D02 — extracts from .accessToken', () => {
      expect(extractToken({ accessToken: 'jwt-def' })).toBe('jwt-def');
    });

    it('D03 — extracts from .data.token', () => {
      expect(extractToken({ data: { token: 'jwt-ghi' } })).toBe('jwt-ghi');
    });

    it('D04 — .token has highest priority', () => {
      expect(extractToken({ token: 'first', accessToken: 'second' })).toBe('first');
    });

    it('D05 — returns empty string when no token found', () => {
      expect(extractToken({ message: 'success' })).toBe('');
    });

    it('D06 — handles null response gracefully', () => {
      expect(extractToken({ data: null as any })).toBe('');
    });
  });

  // ── E — Storage State Generation ──────────────────────────────────────
  describe('E — Storage State Generation', () => {
    const patientUser: UserInfo = { id: 'PT-001', email: 'pt@test.com', name: 'Patient One', role: 'patient', token: 'tok-pt' };
    const doctorUser: UserInfo = { id: 'DOC-001', email: 'doc@test.com', name: 'Dr. Test', role: 'doctor', token: 'tok-doc' };
    const adminUser: UserInfo = { id: 'ADM-001', email: 'adm@test.com', name: 'Admin Test', role: 'admin', token: 'tok-adm' };

    it('E01 — patient entries use izara_user key', () => {
      const entries = buildLocalStorageEntries(patientUser, false, false);
      const userEntry = entries.find(e => e.name === 'izara_user');
      expect(userEntry).toBeDefined();
      expect(JSON.parse(userEntry!.value).id).toBe('PT-001');
    });

    it('E02 — patient entries use auth_token key', () => {
      const entries = buildLocalStorageEntries(patientUser, false, false);
      expect(entries.find(e => e.name === 'auth_token')?.value).toBe('tok-pt');
    });

    it('E03 — doctor entries use izara_current_user key', () => {
      const entries = buildLocalStorageEntries(doctorUser, true, false);
      const userEntry = entries.find(e => e.name === 'izara_current_user');
      expect(userEntry).toBeDefined();
      const parsed = JSON.parse(userEntry!.value);
      expect(parsed.id).toBe('DOC-001');
      expect(parsed.isAdmin).toBe(false);
    });

    it('E04 — admin entries have adminPrivileges', () => {
      const entries = buildLocalStorageEntries(adminUser, true, true);
      const userEntry = entries.find(e => e.name === 'izara_current_user');
      const parsed = JSON.parse(userEntry!.value);
      expect(parsed.isAdmin).toBe(true);
      expect(parsed.adminPrivileges.manageDoctors).toBe(true);
      expect(parsed.adminPrivileges.manageAppointments).toBe(true);
    });

    it('E05 — all entries include generic izara_auth_token', () => {
      const patientEntries = buildLocalStorageEntries(patientUser, false, false);
      const doctorEntries = buildLocalStorageEntries(doctorUser, true, false);
      expect(patientEntries.find(e => e.name === 'izara_auth_token')?.value).toBe('tok-pt');
      expect(doctorEntries.find(e => e.name === 'izara_auth_token')?.value).toBe('tok-doc');
    });

    it('E06 — patient has activity timestamp', () => {
      const entries = buildLocalStorageEntries(patientUser, false, false);
      const activity = entries.find(e => e.name === 'izara_patient_last_activity');
      expect(activity).toBeDefined();
      expect(Number(activity!.value)).toBeGreaterThan(0);
    });

    it('E07 — doctor has session expiry (2h from now)', () => {
      const entries = buildLocalStorageEntries(doctorUser, true, false);
      const expiry = entries.find(e => e.name === 'izara_session_expiry');
      expect(expiry).toBeDefined();
      const expiryMs = Number(expiry!.value);
      const twoHoursMs = 7_200_000;
      expect(expiryMs - Date.now()).toBeGreaterThan(twoHoursMs - 1000);
      expect(expiryMs - Date.now()).toBeLessThan(twoHoursMs + 1000);
    });

    it('E08 — storage state has correct structure', () => {
      const entries = buildLocalStorageEntries(patientUser, false, false);
      const state = buildStorageState('http://localhost:3005', entries);
      expect(state.cookies).toEqual([]);
      expect(state.origins).toHaveLength(1);
      expect(state.origins[0].origin).toBe('http://localhost:3005');
      expect(state.origins[0].localStorage).toBe(entries);
    });

    it('E09 — doctor portal origin differs from patient', () => {
      const pEntries = buildLocalStorageEntries(patientUser, false, false);
      const dEntries = buildLocalStorageEntries(doctorUser, true, false);
      const pState = buildStorageState('http://localhost:3005', pEntries);
      const dState = buildStorageState('http://localhost:3010', dEntries);
      expect(pState.origins[0].origin).not.toBe(dState.origins[0].origin);
    });
  });

  // ── F — Auth Cache Structure ──────────────────────────────────────────
  describe('F — Auth Cache Structure', () => {
    it('F01 — cache has timestamp', () => {
      const cache = buildAuthCache({
        patient1: { id: 'PT-001', email: 'p@t.com', name: 'P', role: 'patient', token: 'tok', portalUrl: 'http://localhost:3005' },
      });
      expect(cache.timestamp).toBeGreaterThan(0);
      expect(cache.timestamp).toBeLessThanOrEqual(Date.now());
    });

    it('F02 — cache preserves all user fields', () => {
      const cache = buildAuthCache({
        doctor: { id: 'DOC-001', email: 'doc@t.com', name: 'Dr. T', role: 'doctor', token: 'jwt-xyz', portalUrl: 'http://localhost:3010' },
      });
      expect(cache.users.doctor).toEqual({
        role: 'doctor', id: 'DOC-001', token: 'jwt-xyz',
        email: 'doc@t.com', name: 'Dr. T', portalUrl: 'http://localhost:3010',
      });
    });

    it('F03 — cache supports 5 simultaneous users', () => {
      const cache = buildAuthCache({
        patient1: { id: 'P1', email: 'p1@t.com', name: 'P1', role: 'patient', token: 't1', portalUrl: 'http://localhost:3005' },
        patient2: { id: 'P2', email: 'p2@t.com', name: 'P2', role: 'patient', token: 't2', portalUrl: 'http://localhost:3005' },
        patient3: { id: 'P3', email: 'p3@t.com', name: 'P3', role: 'patient', token: 't3', portalUrl: 'http://localhost:3005' },
        doctor:   { id: 'D1', email: 'd@t.com',  name: 'D1', role: 'doctor',  token: 't4', portalUrl: 'http://localhost:3010' },
        admin:    { id: 'A1', email: 'a@t.com',  name: 'A1', role: 'admin',   token: 't5', portalUrl: 'http://localhost:3010' },
      });
      expect(Object.keys(cache.users)).toHaveLength(5);
    });
  });

  // ── G — Default Credentials ───────────────────────────────────────────
  describe('G — Default Credentials', () => {
    it('G01 — 5 user accounts configured', () => {
      expect(Object.keys(DEFAULT_CREDENTIALS)).toHaveLength(5);
    });

    it('G02 — patient IDs use PATIENT- prefix', () => {
      expect(DEFAULT_CREDENTIALS.patient1.id).toMatch(/^PATIENT-/);
      expect(DEFAULT_CREDENTIALS.patient2.id).toMatch(/^PATIENT-/);
      expect(DEFAULT_CREDENTIALS.patient3.id).toMatch(/^PATIENT-/);
    });

    it('G03 — doctor ID uses DOC- prefix', () => {
      expect(DEFAULT_CREDENTIALS.doctor.id).toMatch(/^DOC-/);
    });

    it('G04 — admin ID uses ADMIN- prefix', () => {
      expect(DEFAULT_CREDENTIALS.admin.id).toMatch(/^ADMIN-/);
    });

    it('G05 — all emails are unique', () => {
      const emails = Object.values(DEFAULT_CREDENTIALS).map(c => c.email);
      expect(new Set(emails).size).toBe(emails.length);
    });

    it('G06 — all IDs are unique', () => {
      const ids = Object.values(DEFAULT_CREDENTIALS).map(c => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('G07 — doctor/admin emails use @izara.com domain', () => {
      expect(DEFAULT_CREDENTIALS.doctor.email).toMatch(/@izara\.com$/);
      expect(DEFAULT_CREDENTIALS.admin.email).toMatch(/@izara\.com$/);
    });

    it('G08 — patient emails use @gmail.com domain', () => {
      expect(DEFAULT_CREDENTIALS.patient1.email).toMatch(/@gmail\.com$/);
      expect(DEFAULT_CREDENTIALS.patient2.email).toMatch(/@gmail\.com$/);
      expect(DEFAULT_CREDENTIALS.patient3.email).toMatch(/@gmail\.com$/);
    });
  });
});
