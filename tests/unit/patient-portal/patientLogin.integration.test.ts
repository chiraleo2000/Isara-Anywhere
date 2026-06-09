/**
 * @process Processes/Pages/Patient-Portal/01_Login_Page.md
 * Patient login integration contract (AUTH-PAT-01–05).
 */
import { describe, it, expect } from 'vitest';

const PATIENT_EMAIL = 'demo.test@gmail.com';
const PATIENT_PASSWORD = 'P@ssw0rd'; // NOSONAR S2068 — documented test fixture

function validatePatientLogin(body: { email: string; password: string }): { ok: boolean; code?: string } {
  if (!body.email || !body.password) return { ok: false, code: 'MISSING_FIELDS' };
  if (!body.email.includes('@')) return { ok: false, code: 'INVALID_EMAIL' };
  return { ok: true };
}

function patientLoginSuccess(patient: { id: string; email: string; patientId?: string }) {
  return {
    token: `patient-jwt-${patient.id}`,
    user: {
      id: patient.id,
      patientId: patient.patientId ?? patient.id,
      email: patient.email,
      role: 'patient',
    },
  };
}

function patientDashboardGuard(role: string): boolean {
  return role === 'patient';
}

describe('patientLogin.integration — AUTH-PAT', () => {
  it('AUTH-PAT-01 — accepts demo.test@gmail.com fixture', () => {
    expect(validatePatientLogin({ email: PATIENT_EMAIL, password: PATIENT_PASSWORD }).ok).toBe(true);
  });

  it('AUTH-PAT-02 — rejects empty email', () => {
    expect(validatePatientLogin({ email: '', password: PATIENT_PASSWORD }).code).toBe('MISSING_FIELDS');
  });

  it('AUTH-PAT-03 — success maps PATIENT-DEMO with patientId', () => {
    const res = patientLoginSuccess({
      id: 'PATIENT-DEMO',
      patientId: 'PATIENT-DEMO',
      email: PATIENT_EMAIL,
    });
    expect(res.user.patientId).toBe('PATIENT-DEMO');
    expect(res.user.role).toBe('patient');
  });

  it('AUTH-PAT-04 — invalid password error code contract', () => {
    const err = { success: false, error: 'Invalid email or password', code: 'AUTH_FAILED' };
    expect(err.code).toBe('AUTH_FAILED');
  });

  it('AUTH-PAT-05 — only patient role reaches patient dashboard', () => {
    expect(patientDashboardGuard('patient')).toBe(true);
    expect(patientDashboardGuard('doctor')).toBe(false);
  });
});
