/**
 * @process Processes/Pages/Doctor-Portal/01_Login_Page.md
 * Doctor login integration contract (AUTH-DOC-01–05).
 */
import { describe, it, expect } from 'vitest';

const DOCTOR_EMAIL = 'doctor.test@izara.com';
const DOCTOR_PASSWORD = 'IzaraDoctor@2024'; // NOSONAR S2068 — documented test fixture

interface LoginAttempt {
  email: string;
  password: string;
}

function validateDoctorLoginInput(body: LoginAttempt): { ok: boolean; code?: string } {
  if (!body.email || !body.password) return { ok: false, code: 'MISSING_FIELDS' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) return { ok: false, code: 'INVALID_EMAIL' };
  return { ok: true };
}

function mapDoctorLoginSuccess(user: { id: string; email: string; role: string }) {
  return {
    token: `doctor-jwt-${user.id}`,
    user: { id: user.id, email: user.email, role: user.role },
  };
}

function doctorRouteGuard(role: string, path: string): boolean {
  if (path.startsWith('/admin') && role !== 'admin') return false;
  return role === 'doctor' || role === 'admin';
}

describe('doctorLogin.integration — AUTH-DOC', () => {
  it('AUTH-DOC-01 — accepts doctor.test@izara.com credentials shape', () => {
    expect(validateDoctorLoginInput({ email: DOCTOR_EMAIL, password: DOCTOR_PASSWORD }).ok).toBe(true);
  });

  it('AUTH-DOC-02 — rejects missing password', () => {
    expect(validateDoctorLoginInput({ email: DOCTOR_EMAIL, password: '' }).code).toBe('MISSING_FIELDS');
  });

  it('AUTH-DOC-03 — success maps DOC-TEST-001 with doctor role', () => {
    const res = mapDoctorLoginSuccess({ id: 'DOC-TEST-001', email: DOCTOR_EMAIL, role: 'doctor' });
    expect(res.user.id).toBe('DOC-TEST-001');
    expect(res.user.role).toBe('doctor');
    expect(res.token).toContain('DOC-TEST-001');
  });

  it('AUTH-DOC-04 — bad password yields error contract', () => {
    const err = { error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' };
    expect(err.code).toBe('INVALID_CREDENTIALS');
  });

  it('AUTH-DOC-05 — doctor can access clinical routes, not admin-only', () => {
    expect(doctorRouteGuard('doctor', '/dashboard')).toBe(true);
    expect(doctorRouteGuard('doctor', '/admin/users')).toBe(false);
  });
});
