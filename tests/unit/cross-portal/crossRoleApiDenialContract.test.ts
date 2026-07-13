/**
 * Cross-role API denial — doctor vs patient portal role gates.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');

type Role = 'doctor' | 'patient' | 'admin' | 'guest' | string;

function canAccessDoctorApi(role: Role): boolean {
  return role === 'doctor' || role === 'admin';
}

function canAccessPatientApi(role: Role): boolean {
  return role === 'patient' || role === 'admin';
}

describe('crossRoleApiDenialContract — pure role gates', () => {
  it('CRAD-01 — canAccessDoctorApi only doctor|admin', () => {
    expect(canAccessDoctorApi('doctor')).toBe(true);
    expect(canAccessDoctorApi('admin')).toBe(true);
    expect(canAccessDoctorApi('patient')).toBe(false);
    expect(canAccessDoctorApi('guest')).toBe(false);
  });

  it('CRAD-02 — canAccessPatientApi only patient|admin', () => {
    expect(canAccessPatientApi('patient')).toBe(true);
    expect(canAccessPatientApi('admin')).toBe(true);
    expect(canAccessPatientApi('doctor')).toBe(false);
    expect(canAccessPatientApi('guest')).toBe(false);
  });
});

describe('crossRoleApiDenialContract — source role checks', () => {
  it('CRAD-03 — doctor mainApiServer or auth uses role checks', () => {
    const mainApi = fs.readFileSync(
      path.join(root, 'Isara-doctor-portal/backend/mainApiServer.cjs'),
      'utf8',
    );
    const sessionAuth = fs.readFileSync(
      path.join(root, 'Isara-doctor-portal/backend/sessionAuth.cjs'),
      'utf8',
    );
    const combined = `${mainApi}\n${sessionAuth}`;
    expect(combined).toMatch(/role === ['"]doctor['"]|role !== ['"]doctor['"]|Insufficient role|role IN \('doctor'/);
  });

  it('CRAD-04 — patient middleware checks role', () => {
    const authMw = fs.readFileSync(
      path.join(root, 'Isara-patient-portal/backend/middleware/auth.ts'),
      'utf8',
    );
    const owasp = fs.readFileSync(
      path.join(root, 'Isara-patient-portal/backend/middleware/owasp-middleware.ts'),
      'utf8',
    );
    const combined = `${authMw}\n${owasp}`;
    expect(combined).toMatch(/role.*patient|patient.*role|userRole|req\.user\?\.role/);
  });
});
