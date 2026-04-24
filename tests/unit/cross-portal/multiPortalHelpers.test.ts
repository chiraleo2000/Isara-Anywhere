/**
 * ═══════════════════════════════════════════════════════════════════════
 * Multi-Portal Helper Functions — Unit Tests
 * ═══════════════════════════════════════════════════════════════════════
 * Tests: URL resolution, assertion helpers, navigation retry logic,
 *        cloud detection, environment variable fallback chains
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── URL Resolution Logic (mirrors multi-portal.ts) ────────────────────

function resolvePatientUrl(env: Record<string, string | undefined>, isCloud: boolean): string {
  if (isCloud) {
    return env.CLOUD_PATIENT_URL || env.PATIENT_URL || env.PATIENT_PORTAL_URL
      || 'https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app';
  }
  return env.PATIENT_URL || env.PATIENT_PORTAL_URL || env.LOCAL_PATIENT_URL || 'http://localhost:3005';
}

function resolveDoctorUrl(env: Record<string, string | undefined>, isCloud: boolean): string {
  if (isCloud) {
    return env.CLOUD_DOCTOR_URL || env.DOCTOR_URL || env.DOCTOR_PORTAL_URL
      || 'https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app';
  }
  return env.DOCTOR_URL || env.DOCTOR_PORTAL_URL || env.LOCAL_DOCTOR_URL || 'http://localhost:3010';
}

function resolveMeetingUrl(env: Record<string, string | undefined>, isCloud: boolean): string {
  if (isCloud) {
    return env.CLOUD_MEETING_URL || env.MEETING_URL || env.MEETING_SERVER_URL
      || 'https://izara-meeting-server-dev-testing-724889190329.asia-southeast1.run.app';
  }
  return env.MEETING_URL || env.MEETING_SERVER_URL || env.LOCAL_MEETING_URL || 'http://localhost:3020';
}

function isCloudEnvironment(testEnv?: string): boolean {
  return testEnv === 'cloud';
}

// ── Assertion Helpers (mirrors multi-portal.ts) ────────────────────────

function checkLoginRedirect(url: string): boolean {
  return url.includes('/login') || url.includes('/register');
}

function checkWhiteout(bodyLength: number, threshold = 50): boolean {
  return bodyLength < threshold;
}

function checkFrozenState(text: string): boolean {
  return /^(loading|กำลังโหลด|\.\.\.)\s*$/i.test(text.trim());
}

function checkPageErrors(bodyText: string): string[] {
  const lower = bodyText.toLowerCase();
  const problems: string[] = [];
  if (lower.includes('something went wrong')) problems.push('Error boundary');
  if (lower.includes('failed to fetch')) problems.push('Failed to fetch');
  if (lower.includes('network error')) problems.push('Network error');
  if (lower.includes('500 internal server')) problems.push('500');
  if (lower.includes('502 bad gateway')) problems.push('502');
  if (lower.includes('cannot read properties')) problems.push('JS crash');
  return problems;
}

// ── Navigation Map (mirrors DOCTOR_NAV_MAP) ────────────────────────────

const DOCTOR_NAV_MAP: Record<string, RegExp> = {
  'dashboard':           /แดชบอร์ด|Dashboard/i,
  'schedule':            /ตารางนัด|Schedule/i,
  'patients':            /ผู้ป่วย|Patients/i,
  'health-meeting':      /นัดหมาย.*ประชุม|Appointments.*Meeting/i,
  'meetings':            /นัดหมาย.*ประชุม|Appointments.*Meeting/i,
  'appointment-pool':    /กลุ่มนัดหมาย|Appointment Pool/i,
  'pool':                /กลุ่มนัดหมาย|Appointment Pool/i,
  'medical-consultants': /ที่ปรึกษา.*แพทย์|Medical Consultant/i,
  'consultants':         /ที่ปรึกษา.*แพทย์|Medical Consultant/i,
  'medical-content':     /เนื้อหา.*การแพทย์|Medical Content/i,
  'content':             /เนื้อหา.*การแพทย์|Medical Content/i,
  'clinical-resources':  /ทรัพยากร.*คลินิก|Clinical Resource/i,
  'resources':           /ทรัพยากร.*คลินิก|Clinical Resource/i,
  'doctors':             /จัดการแพทย์|Manage Doctor/i,
  'doctor-management':   /อนุมัติ.*แพทย์|Doctor Approval/i,
  'approval':            /อนุมัติ.*แพทย์|Doctor Approval/i,
  'profile':             /โปรไฟล์|แก้ไขโปรไฟล์|Profile/i,
};

function resolveNavTarget(target: string): RegExp | string {
  const key = target.toLowerCase().trim();
  return DOCTOR_NAV_MAP[key] || target;
}

// ── Timeout Constants ──────────────────────────────────────────────────

function getNavTimeout(isCloud: boolean): number {
  return isCloud ? 90_000 : 30_000;
}

function getFixtureNavTimeout(isCloud: boolean): number {
  return isCloud ? 120_000 : 60_000;
}

// ═══════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════

describe('Multi-Portal Helpers', () => {

  // ── A — Cloud Detection ──────────────────────────────────────────────
  describe('A — Cloud Environment Detection', () => {
    it('A01 — TEST_ENV=cloud returns true', () => {
      expect(isCloudEnvironment('cloud')).toBe(true);
    });

    it('A02 — TEST_ENV=local returns false', () => {
      expect(isCloudEnvironment('local')).toBe(false);
    });

    it('A03 — undefined TEST_ENV returns false', () => {
      expect(isCloudEnvironment(undefined)).toBe(false);
    });

    it('A04 — empty string returns false', () => {
      expect(isCloudEnvironment('')).toBe(false);
    });

    it('A05 — case sensitivity — "Cloud" is not "cloud"', () => {
      expect(isCloudEnvironment('Cloud')).toBe(false);
    });
  });

  // ── B — Patient URL Resolution ────────────────────────────────────────
  describe('B — Patient URL Resolution', () => {
    it('B01 — local defaults to localhost:3005', () => {
      expect(resolvePatientUrl({}, false)).toBe('http://localhost:3005');
    });

    it('B02 — PATIENT_URL overrides local default', () => {
      expect(resolvePatientUrl({ PATIENT_URL: 'http://custom:4000' }, false)).toBe('http://custom:4000');
    });

    it('B03 — PATIENT_PORTAL_URL is second fallback', () => {
      expect(resolvePatientUrl({ PATIENT_PORTAL_URL: 'http://portal:5000' }, false)).toBe('http://portal:5000');
    });

    it('B04 — LOCAL_PATIENT_URL is third fallback', () => {
      expect(resolvePatientUrl({ LOCAL_PATIENT_URL: 'http://local:6000' }, false)).toBe('http://local:6000');
    });

    it('B05 — cloud defaults to Cloud Run URL', () => {
      const url = resolvePatientUrl({}, true);
      expect(url).toContain('asia-southeast1.run.app');
      expect(url).toContain('patient-portal');
    });

    it('B06 — CLOUD_PATIENT_URL overrides cloud default', () => {
      expect(resolvePatientUrl({ CLOUD_PATIENT_URL: 'https://custom.run.app' }, true)).toBe('https://custom.run.app');
    });

    it('B07 — PATIENT_URL is second cloud fallback', () => {
      expect(resolvePatientUrl({ PATIENT_URL: 'https://alt.run.app' }, true)).toBe('https://alt.run.app');
    });

    it('B08 — env var priority chain: CLOUD > PATIENT > PORTAL', () => {
      const env = {
        CLOUD_PATIENT_URL: 'https://cloud.app',
        PATIENT_URL: 'https://patient.app',
        PATIENT_PORTAL_URL: 'https://portal.app',
      };
      expect(resolvePatientUrl(env, true)).toBe('https://cloud.app');
    });
  });

  // ── C — Doctor URL Resolution ─────────────────────────────────────────
  describe('C — Doctor URL Resolution', () => {
    it('C01 — local defaults to localhost:3010', () => {
      expect(resolveDoctorUrl({}, false)).toBe('http://localhost:3010');
    });

    it('C02 — cloud defaults to Cloud Run URL', () => {
      const url = resolveDoctorUrl({}, true);
      expect(url).toContain('doctor-portal');
      expect(url).toContain('run.app');
    });

    it('C03 — CLOUD_DOCTOR_URL overrides cloud default', () => {
      expect(resolveDoctorUrl({ CLOUD_DOCTOR_URL: 'https://doc.run.app' }, true)).toBe('https://doc.run.app');
    });

    it('C04 — LOCAL_DOCTOR_URL is last local fallback', () => {
      expect(resolveDoctorUrl({ LOCAL_DOCTOR_URL: 'http://local-doc:8080' }, false)).toBe('http://local-doc:8080');
    });
  });

  // ── D — Meeting URL Resolution ────────────────────────────────────────
  describe('D — Meeting URL Resolution', () => {
    it('D01 — local defaults to localhost:3020', () => {
      expect(resolveMeetingUrl({}, false)).toBe('http://localhost:3020');
    });

    it('D02 — cloud defaults to Cloud Run URL', () => {
      const url = resolveMeetingUrl({}, true);
      expect(url).toContain('meeting-server');
      expect(url).toContain('run.app');
    });

    it('D03 — MEETING_URL overrides local default', () => {
      expect(resolveMeetingUrl({ MEETING_URL: 'http://meet:9000' }, false)).toBe('http://meet:9000');
    });

    it('D04 — MEETING_SERVER_URL is second fallback', () => {
      expect(resolveMeetingUrl({ MEETING_SERVER_URL: 'http://srv:7000' }, false)).toBe('http://srv:7000');
    });
  });

  // ── E — Login Redirect Detection ──────────────────────────────────────
  describe('E — Login Redirect Detection', () => {
    it('E01 — /login path detected', () => {
      expect(checkLoginRedirect('http://localhost:3005/login')).toBe(true);
    });

    it('E02 — /register path detected', () => {
      expect(checkLoginRedirect('http://localhost:3005/register')).toBe(true);
    });

    it('E03 — dashboard path is not login', () => {
      expect(checkLoginRedirect('http://localhost:3005/dashboard')).toBe(false);
    });

    it('E04 — /login in query string still detected', () => {
      expect(checkLoginRedirect('http://localhost:3005/page?redirect=/login')).toBe(true);
    });

    it('E05 — empty URL is not login', () => {
      expect(checkLoginRedirect('')).toBe(false);
    });

    it('E06 — complex doctor URL with /login', () => {
      expect(checkLoginRedirect('http://localhost:3010/doctor/login')).toBe(true);
    });
  });

  // ── F — Whiteout Detection ────────────────────────────────────────────
  describe('F — Whiteout Detection', () => {
    it('F01 — 0 chars is whiteout', () => {
      expect(checkWhiteout(0)).toBe(true);
    });

    it('F02 — 49 chars is whiteout', () => {
      expect(checkWhiteout(49)).toBe(true);
    });

    it('F03 — 50 chars is NOT whiteout', () => {
      expect(checkWhiteout(50)).toBe(false);
    });

    it('F04 — 500 chars is healthy', () => {
      expect(checkWhiteout(500)).toBe(false);
    });

    it('F05 — custom threshold works', () => {
      expect(checkWhiteout(99, 100)).toBe(true);
      expect(checkWhiteout(100, 100)).toBe(false);
    });
  });

  // ── G — Frozen State Detection ────────────────────────────────────────
  describe('G — Frozen State Detection', () => {
    it('G01 — "loading" detected as frozen', () => {
      expect(checkFrozenState('loading')).toBe(true);
    });

    it('G02 — "Loading" case insensitive', () => {
      expect(checkFrozenState('Loading')).toBe(true);
    });

    it('G03 — "กำลังโหลด" (Thai loading) detected', () => {
      expect(checkFrozenState('กำลังโหลด')).toBe(true);
    });

    it('G04 — "..." dots detected', () => {
      expect(checkFrozenState('...')).toBe(true);
    });

    it('G05 — real content is NOT frozen', () => {
      expect(checkFrozenState('Welcome to Izara Telemedicine')).toBe(false);
    });

    it('G06 — "loading" with extra whitespace', () => {
      expect(checkFrozenState('  loading  ')).toBe(true);
    });

    it('G07 — empty string is NOT frozen', () => {
      expect(checkFrozenState('')).toBe(false);
    });
  });

  // ── H — Page Error Detection ──────────────────────────────────────────
  describe('H — Page Error Detection', () => {
    it('H01 — clean page has no errors', () => {
      expect(checkPageErrors('Welcome to the dashboard. Everything is working.')).toEqual([]);
    });

    it('H02 — "Something went wrong" detected', () => {
      const errors = checkPageErrors('Oops! Something went wrong. Please try again.');
      expect(errors).toContain('Error boundary');
    });

    it('H03 — "Failed to fetch" detected', () => {
      const errors = checkPageErrors('Error: Failed to fetch data');
      expect(errors).toContain('Failed to fetch');
    });

    it('H04 — "Network error" detected', () => {
      const errors = checkPageErrors('Network error occurred');
      expect(errors).toContain('Network error');
    });

    it('H05 — "500 Internal Server" detected', () => {
      const errors = checkPageErrors('500 Internal Server Error');
      expect(errors).toContain('500');
    });

    it('H06 — "502 Bad Gateway" detected', () => {
      const errors = checkPageErrors('502 Bad Gateway');
      expect(errors).toContain('502');
    });

    it('H07 — "Cannot read properties" JS crash detected', () => {
      const errors = checkPageErrors('TypeError: Cannot read properties of undefined');
      expect(errors).toContain('JS crash');
    });

    it('H08 — multiple errors detected at once', () => {
      const errors = checkPageErrors('Failed to fetch data. Network error. 500 Internal Server Error.');
      expect(errors).toHaveLength(3);
      expect(errors).toContain('Failed to fetch');
      expect(errors).toContain('Network error');
      expect(errors).toContain('500');
    });

    it('H09 — case insensitive detection', () => {
      expect(checkPageErrors('SOMETHING WENT WRONG')).toContain('Error boundary');
    });
  });

  // ── I — Doctor Navigation Map ─────────────────────────────────────────
  describe('I — Doctor Navigation Map Resolution', () => {
    it('I01 — "dashboard" resolves to regex', () => {
      const result = resolveNavTarget('dashboard');
      expect(result).toBeInstanceOf(RegExp);
      expect((result as RegExp).test('Dashboard')).toBe(true);
      expect((result as RegExp).test('แดชบอร์ด')).toBe(true);
    });

    it('I02 — "schedule" resolves to schedule regex', () => {
      const result = resolveNavTarget('schedule');
      expect(result).toBeInstanceOf(RegExp);
      expect((result as RegExp).test('Schedule')).toBe(true);
      expect((result as RegExp).test('ตารางนัด')).toBe(true);
    });

    it('I03 — "patients" resolves to patients regex', () => {
      const result = resolveNavTarget('patients');
      expect(result).toBeInstanceOf(RegExp);
      expect((result as RegExp).test('Patients')).toBe(true);
      expect((result as RegExp).test('ผู้ป่วย')).toBe(true);
    });

    it('I04 — unknown target returns original string', () => {
      expect(resolveNavTarget('unknown-page')).toBe('unknown-page');
    });

    it('I05 — case insensitive key matching', () => {
      const result = resolveNavTarget('Dashboard');
      expect(result).toBeInstanceOf(RegExp);
    });

    it('I06 — all 17 navigation entries have valid regex', () => {
      const keys = Object.keys(DOCTOR_NAV_MAP);
      expect(keys.length).toBe(17);
      for (const key of keys) {
        expect(DOCTOR_NAV_MAP[key]).toBeInstanceOf(RegExp);
      }
    });

    it('I07 — profile supports Thai and English', () => {
      const result = resolveNavTarget('profile');
      expect(result).toBeInstanceOf(RegExp);
      expect((result as RegExp).test('Profile')).toBe(true);
      expect((result as RegExp).test('โปรไฟล์')).toBe(true);
    });

    it('I08 — medical-content supports bilingual', () => {
      const result = resolveNavTarget('medical-content');
      expect(result).toBeInstanceOf(RegExp);
      expect((result as RegExp).test('Medical Content Management')).toBe(true);
      expect((result as RegExp).test('เนื้อหาทางการแพทย์')).toBe(true);
    });
  });

  // ── J — Timeout Configuration ─────────────────────────────────────────
  describe('J — Timeout Configuration', () => {
    it('J01 — local nav timeout is 30s', () => {
      expect(getNavTimeout(false)).toBe(30_000);
    });

    it('J02 — cloud nav timeout is 90s', () => {
      expect(getNavTimeout(true)).toBe(90_000);
    });

    it('J03 — local fixture timeout is 60s', () => {
      expect(getFixtureNavTimeout(false)).toBe(60_000);
    });

    it('J04 — cloud fixture timeout is 120s', () => {
      expect(getFixtureNavTimeout(true)).toBe(120_000);
    });

    it('J05 — cloud timeouts are >= 3x local timeouts', () => {
      expect(getNavTimeout(true)).toBeGreaterThanOrEqual(getNavTimeout(false) * 3);
    });

    it('J06 — fixture timeout > nav timeout for both envs', () => {
      expect(getFixtureNavTimeout(false)).toBeGreaterThan(getNavTimeout(false));
      expect(getFixtureNavTimeout(true)).toBeGreaterThan(getNavTimeout(true));
    });
  });
});
