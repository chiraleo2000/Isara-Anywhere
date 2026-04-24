/**
 * ═══════════════════════════════════════════════════════════════════════
 * Auth State Validation — Unit Tests
 * ═══════════════════════════════════════════════════════════════════════
 * Tests: Storage state format validation, localStorage key consistency,
 *        token format checks, role-based key differences, session
 *        expiry calculations, auth re-injection patterns
 */
import { describe, it, expect } from 'vitest';

// ── Storage State Format ──────────────────────────────────────────────

interface StorageStateEntry {
  name: string;
  value: string;
}

interface StorageState {
  cookies: unknown[];
  origins: Array<{
    origin: string;
    localStorage: StorageStateEntry[];
  }>;
}

function validateStorageStateFormat(state: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!state || typeof state !== 'object') {
    return { valid: false, errors: ['State is not an object'] };
  }
  const s = state as Record<string, unknown>;
  if (!Array.isArray(s.cookies)) errors.push('Missing or invalid cookies array');
  if (!Array.isArray(s.origins)) errors.push('Missing or invalid origins array');
  if (Array.isArray(s.origins) && s.origins.length === 0) errors.push('No origins defined');
  if (Array.isArray(s.origins) && s.origins.length > 0) {
    const first = s.origins[0] as Record<string, unknown>;
    if (typeof first.origin !== 'string') errors.push('Missing origin URL');
    if (!Array.isArray(first.localStorage)) errors.push('Missing localStorage array');
  }
  return { valid: errors.length === 0, errors };
}

// ── Role-Based Key Validation ─────────────────────────────────────────

const PATIENT_REQUIRED_KEYS = ['auth_token', 'izara_user', 'izara_patient_last_activity', 'izara_auth_token', 'user'];
const DOCTOR_REQUIRED_KEYS = ['token', 'izara_current_user', 'izara_session_expiry', 'izara_last_activity', 'izara_auth_token', 'user'];

function validatePatientKeys(entries: StorageStateEntry[]): { valid: boolean; missing: string[] } {
  const names = new Set(entries.map(e => e.name));
  const missing = PATIENT_REQUIRED_KEYS.filter(k => !names.has(k));
  return { valid: missing.length === 0, missing };
}

function validateDoctorKeys(entries: StorageStateEntry[]): { valid: boolean; missing: string[] } {
  const names = new Set(entries.map(e => e.name));
  const missing = DOCTOR_REQUIRED_KEYS.filter(k => !names.has(k));
  return { valid: missing.length === 0, missing };
}

// ── Token Format ──────────────────────────────────────────────────────

function isValidJwtFormat(token: string): boolean {
  if (!token) return false;
  const parts = token.split('.');
  return parts.length === 3 && parts.every(p => p.length > 0);
}

function isTokenPresent(entries: StorageStateEntry[], key: string): boolean {
  const entry = entries.find(e => e.name === key);
  return !!entry && entry.value.length > 0;
}

// ── User Data Parsing ─────────────────────────────────────────────────

function parseUserFromEntry(entry: StorageStateEntry): { id: string; email: string; role: string } | null {
  try {
    const parsed = JSON.parse(entry.value);
    if (parsed.id && parsed.email) return { id: parsed.id, email: parsed.email, role: parsed.role || 'unknown' };
    return null;
  } catch {
    return null;
  }
}

function extractUserIdFromState(state: StorageState, key: string): string | null {
  const entries = state.origins?.[0]?.localStorage || [];
  const entry = entries.find(e => e.name === key);
  if (!entry) return null;
  const user = parseUserFromEntry(entry);
  return user?.id || null;
}

// ── Session Expiry ────────────────────────────────────────────────────

function isSessionValid(expiryTimestamp: number, nowMs?: number): boolean {
  const now = nowMs ?? Date.now();
  return expiryTimestamp > now;
}

function getSessionRemainingMs(expiryTimestamp: number, nowMs?: number): number {
  const now = nowMs ?? Date.now();
  return Math.max(0, expiryTimestamp - now);
}

function shouldRefreshSession(lastActivityMs: number, inactivityLimitMs: number, nowMs?: number): boolean {
  const now = nowMs ?? Date.now();
  return (now - lastActivityMs) > (inactivityLimitMs * 0.8); // refresh at 80% of limit
}

// ── Auth Re-injection Pattern ─────────────────────────────────────────

function needsAuthReinjection(currentUrl: string): boolean {
  return currentUrl.includes('/login') || currentUrl.includes('/register');
}

function buildReinjectionEntries(
  originalEntries: StorageStateEntry[],
  extraKeys?: Record<string, string>
): StorageStateEntry[] {
  const entries = [...originalEntries];
  if (extraKeys) {
    for (const [name, value] of Object.entries(extraKeys)) {
      const existing = entries.findIndex(e => e.name === name);
      if (existing >= 0) entries[existing] = { name, value };
      else entries.push({ name, value });
    }
  }
  return entries;
}

// ── Origin URL Validation ─────────────────────────────────────────────

function validateOriginUrl(origin: string, role: string): boolean {
  if (role === 'patient') {
    return origin.includes('3005') || origin.includes('patient-portal');
  }
  if (role === 'doctor' || role === 'admin') {
    return origin.includes('3010') || origin.includes('doctor-portal');
  }
  return false;
}

// ═══════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════

describe('Auth State Validation', () => {

  // ── A — Storage State Format ──────────────────────────────────────────
  describe('A — Storage State Format', () => {
    it('A01 — valid state passes validation', () => {
      const state = {
        cookies: [],
        origins: [{ origin: 'http://localhost:3005', localStorage: [{ name: 'token', value: 'abc' }] }],
      };
      expect(validateStorageStateFormat(state).valid).toBe(true);
    });

    it('A02 — null state fails', () => {
      expect(validateStorageStateFormat(null).valid).toBe(false);
    });

    it('A03 — missing cookies fails', () => {
      const state = { origins: [{ origin: 'http://localhost:3005', localStorage: [] }] };
      const result = validateStorageStateFormat(state);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing or invalid cookies array');
    });

    it('A04 — missing origins fails', () => {
      const state = { cookies: [] };
      const result = validateStorageStateFormat(state);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing or invalid origins array');
    });

    it('A05 — empty origins array fails', () => {
      const state = { cookies: [], origins: [] };
      const result = validateStorageStateFormat(state);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('No origins defined');
    });

    it('A06 — invalid origin entry fails', () => {
      const state = { cookies: [], origins: [{ origin: 123 }] };
      const result = validateStorageStateFormat(state);
      expect(result.valid).toBe(false);
    });
  });

  // ── B — Patient Key Validation ────────────────────────────────────────
  describe('B — Patient Key Validation', () => {
    const validPatientEntries: StorageStateEntry[] = [
      { name: 'auth_token', value: 'tok-123' },
      { name: 'izara_user', value: '{"id":"PT-001"}' },
      { name: 'izara_patient_last_activity', value: '1700000000000' },
      { name: 'izara_auth_token', value: 'tok-123' },
      { name: 'user', value: '{"id":"PT-001"}' },
    ];

    it('B01 — valid patient entries pass', () => {
      expect(validatePatientKeys(validPatientEntries).valid).toBe(true);
    });

    it('B02 — missing auth_token fails', () => {
      const entries = validPatientEntries.filter(e => e.name !== 'auth_token');
      const result = validatePatientKeys(entries);
      expect(result.valid).toBe(false);
      expect(result.missing).toContain('auth_token');
    });

    it('B03 — missing izara_user fails', () => {
      const entries = validPatientEntries.filter(e => e.name !== 'izara_user');
      expect(validatePatientKeys(entries).missing).toContain('izara_user');
    });

    it('B04 — 5 required patient keys', () => {
      expect(PATIENT_REQUIRED_KEYS).toHaveLength(5);
    });

    it('B05 — patient does NOT use izara_current_user', () => {
      expect(PATIENT_REQUIRED_KEYS).not.toContain('izara_current_user');
    });
  });

  // ── C — Doctor Key Validation ─────────────────────────────────────────
  describe('C — Doctor Key Validation', () => {
    const validDoctorEntries: StorageStateEntry[] = [
      { name: 'token', value: 'tok-456' },
      { name: 'izara_current_user', value: '{"id":"DOC-001"}' },
      { name: 'izara_session_expiry', value: '1700007200000' },
      { name: 'izara_last_activity', value: '1700000000000' },
      { name: 'izara_auth_token', value: 'tok-456' },
      { name: 'user', value: '{"id":"DOC-001"}' },
    ];

    it('C01 — valid doctor entries pass', () => {
      expect(validateDoctorKeys(validDoctorEntries).valid).toBe(true);
    });

    it('C02 — missing izara_current_user fails', () => {
      const entries = validDoctorEntries.filter(e => e.name !== 'izara_current_user');
      expect(validateDoctorKeys(entries).missing).toContain('izara_current_user');
    });

    it('C03 — missing izara_session_expiry fails', () => {
      const entries = validDoctorEntries.filter(e => e.name !== 'izara_session_expiry');
      expect(validateDoctorKeys(entries).missing).toContain('izara_session_expiry');
    });

    it('C04 — 6 required doctor keys', () => {
      expect(DOCTOR_REQUIRED_KEYS).toHaveLength(6);
    });

    it('C05 — doctor uses izara_current_user, NOT izara_user', () => {
      expect(DOCTOR_REQUIRED_KEYS).toContain('izara_current_user');
      expect(DOCTOR_REQUIRED_KEYS).not.toContain('izara_user');
    });

    it('C06 — doctor and patient key sets differ', () => {
      const shared = PATIENT_REQUIRED_KEYS.filter(k => DOCTOR_REQUIRED_KEYS.includes(k));
      // Only izara_auth_token and user are shared
      expect(shared).toContain('izara_auth_token');
      expect(shared).toContain('user');
      expect(shared).toHaveLength(2);
    });
  });

  // ── D — Token Format ─────────────────────────────────────────────────
  describe('D — Token Format Validation', () => {
    it('D01 — valid JWT format (3 dot-separated parts)', () => {
      expect(isValidJwtFormat('header.payload.signature')).toBe(true);
    });

    it('D02 — empty string is invalid', () => {
      expect(isValidJwtFormat('')).toBe(false);
    });

    it('D03 — 2 parts is invalid', () => {
      expect(isValidJwtFormat('header.payload')).toBe(false);
    });

    it('D04 — 4 parts is invalid', () => {
      expect(isValidJwtFormat('a.b.c.d')).toBe(false);
    });

    it('D05 — real JWT-like token is valid', () => {
      const realish = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.dGVzdHNpZw';
      expect(isValidJwtFormat(realish)).toBe(true);
    });

    it('D06 — token presence check works', () => {
      const entries: StorageStateEntry[] = [
        { name: 'auth_token', value: 'jwt-abc' },
        { name: 'empty_token', value: '' },
      ];
      expect(isTokenPresent(entries, 'auth_token')).toBe(true);
      expect(isTokenPresent(entries, 'empty_token')).toBe(false);
      expect(isTokenPresent(entries, 'missing')).toBe(false);
    });
  });

  // ── E — User Data Parsing ────────────────────────────────────────────
  describe('E — User Data Parsing', () => {
    it('E01 — parses valid patient user JSON', () => {
      const entry: StorageStateEntry = {
        name: 'izara_user',
        value: JSON.stringify({ id: 'PT-001', email: 'p@t.com', role: 'patient', name: 'Test' }),
      };
      const user = parseUserFromEntry(entry);
      expect(user).not.toBeNull();
      expect(user!.id).toBe('PT-001');
      expect(user!.email).toBe('p@t.com');
      expect(user!.role).toBe('patient');
    });

    it('E02 — parses doctor user with extra fields', () => {
      const entry: StorageStateEntry = {
        name: 'izara_current_user',
        value: JSON.stringify({
          id: 'DOC-001', email: 'doc@t.com', role: 'doctor',
          doctorId: 'DOC-001', isAdmin: false, isActive: true,
        }),
      };
      const user = parseUserFromEntry(entry);
      expect(user!.id).toBe('DOC-001');
      expect(user!.role).toBe('doctor');
    });

    it('E03 — invalid JSON returns null', () => {
      const entry: StorageStateEntry = { name: 'bad', value: 'not-json{' };
      expect(parseUserFromEntry(entry)).toBeNull();
    });

    it('E04 — missing id returns null', () => {
      const entry: StorageStateEntry = { name: 'test', value: JSON.stringify({ email: 'a@b.com' }) };
      expect(parseUserFromEntry(entry)).toBeNull();
    });

    it('E05 — extractUserIdFromState finds patient ID', () => {
      const state: StorageState = {
        cookies: [],
        origins: [{
          origin: 'http://localhost:3005',
          localStorage: [
            { name: 'izara_user', value: JSON.stringify({ id: 'PT-001', email: 'p@t.com' }) },
          ],
        }],
      };
      expect(extractUserIdFromState(state, 'izara_user')).toBe('PT-001');
    });

    it('E06 — extractUserIdFromState returns null for missing key', () => {
      const state: StorageState = {
        cookies: [],
        origins: [{ origin: 'http://localhost:3005', localStorage: [] }],
      };
      expect(extractUserIdFromState(state, 'izara_user')).toBeNull();
    });
  });

  // ── F — Session Expiry ────────────────────────────────────────────────
  describe('F — Session Expiry Validation', () => {
    const now = 1_700_000_000_000;

    it('F01 — future expiry is valid', () => {
      expect(isSessionValid(now + 3600_000, now)).toBe(true);
    });

    it('F02 — past expiry is invalid', () => {
      expect(isSessionValid(now - 1000, now)).toBe(false);
    });

    it('F03 — exact now is invalid (not strictly greater)', () => {
      expect(isSessionValid(now, now)).toBe(false);
    });

    it('F04 — remaining time calculation', () => {
      expect(getSessionRemainingMs(now + 3600_000, now)).toBe(3600_000);
    });

    it('F05 — expired session has 0 remaining', () => {
      expect(getSessionRemainingMs(now - 1000, now)).toBe(0);
    });

    it('F06 — should refresh when 80% of inactivity limit reached', () => {
      const limit = 900_000; // 15 min
      const lastActivity = now - 720_001; // >12 min ago (>80%)
      expect(shouldRefreshSession(lastActivity, limit, now)).toBe(true);
    });

    it('F07 — should NOT refresh when well within limit', () => {
      const limit = 900_000; // 15 min
      const lastActivity = now - 300_000; // 5 min ago (33%)
      expect(shouldRefreshSession(lastActivity, limit, now)).toBe(false);
    });
  });

  // ── G — Auth Re-injection ────────────────────────────────────────────
  describe('G — Auth Re-injection', () => {
    it('G01 — /login URL needs re-injection', () => {
      expect(needsAuthReinjection('http://localhost:3005/login')).toBe(true);
    });

    it('G02 — /register URL needs re-injection', () => {
      expect(needsAuthReinjection('http://localhost:3005/register')).toBe(true);
    });

    it('G03 — /dashboard does NOT need re-injection', () => {
      expect(needsAuthReinjection('http://localhost:3005/dashboard')).toBe(false);
    });

    it('G04 — re-injection preserves original entries', () => {
      const original: StorageStateEntry[] = [
        { name: 'auth_token', value: 'tok-123' },
        { name: 'user', value: '{"id":"PT-001"}' },
      ];
      const result = buildReinjectionEntries(original);
      expect(result).toHaveLength(2);
      expect(result[0].value).toBe('tok-123');
    });

    it('G05 — re-injection adds extra keys', () => {
      const original: StorageStateEntry[] = [
        { name: 'auth_token', value: 'tok-123' },
      ];
      const result = buildReinjectionEntries(original, {
        izara_patient_last_activity: Date.now().toString(),
      });
      expect(result).toHaveLength(2);
    });

    it('G06 — re-injection updates existing extra keys', () => {
      const original: StorageStateEntry[] = [
        { name: 'auth_token', value: 'old-tok' },
      ];
      const result = buildReinjectionEntries(original, {
        auth_token: 'new-tok',
      });
      expect(result).toHaveLength(1);
      expect(result[0].value).toBe('new-tok');
    });
  });

  // ── H — Origin URL Validation ────────────────────────────────────────
  describe('H — Origin URL Correctness', () => {
    it('H01 — patient uses port 3005', () => {
      expect(validateOriginUrl('http://localhost:3005', 'patient')).toBe(true);
    });

    it('H02 — doctor uses port 3010', () => {
      expect(validateOriginUrl('http://localhost:3010', 'doctor')).toBe(true);
    });

    it('H03 — admin uses same port as doctor (3010)', () => {
      expect(validateOriginUrl('http://localhost:3010', 'admin')).toBe(true);
    });

    it('H04 — patient on wrong port fails', () => {
      expect(validateOriginUrl('http://localhost:3010', 'patient')).toBe(false);
    });

    it('H05 — doctor on wrong port fails', () => {
      expect(validateOriginUrl('http://localhost:3005', 'doctor')).toBe(false);
    });

    it('H06 — cloud patient URL validates', () => {
      expect(validateOriginUrl('https://izara-patient-portal-dev.run.app', 'patient')).toBe(true);
    });

    it('H07 — cloud doctor URL validates', () => {
      expect(validateOriginUrl('https://izara-doctor-portal-dev.run.app', 'doctor')).toBe(true);
    });

    it('H08 — unknown role fails', () => {
      expect(validateOriginUrl('http://localhost:3005', 'nurse')).toBe(false);
    });
  });
});
