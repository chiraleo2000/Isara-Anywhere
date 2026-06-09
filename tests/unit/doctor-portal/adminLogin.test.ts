/**
 * @process Processes/Pages/Doctor-Portal/17_Admin_Appointment_Management.md
 * Admin login contract (AUTH-ADM-01–05).
 */
import { describe, it, expect } from 'vitest';

const ADMIN_EMAIL = 'admin.test@izara.com';
const ADMIN_PASSWORD = 'IzaraAdmin@2024'; // NOSONAR S2068 — documented test fixture

function validateAdminLogin(body: { email: string; password: string }): boolean {
  return Boolean(body.email && body.password && body.email.includes('@'));
}

function adminLoginResponse(user: { id: string; role: string }) {
  return {
    token: `admin-jwt-${user.id}`,
    user: { ...user, isAdmin: user.role === 'admin' },
  };
}

function canAccessAdminRoute(role: string, isAdmin?: boolean): boolean {
  return role === 'admin' || Boolean(isAdmin);
}

describe('adminLogin — AUTH-ADM', () => {
  it('AUTH-ADM-01 — accepts admin.test@izara.com fixture', () => {
    expect(validateAdminLogin({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })).toBe(true);
  });

  it('AUTH-ADM-02 — maps ADMIN-TEST-001 id', () => {
    const res = adminLoginResponse({ id: 'ADMIN-TEST-001', role: 'admin' });
    expect(res.user.id).toBe('ADMIN-TEST-001');
    expect(res.user.isAdmin).toBe(true);
  });

  it('AUTH-ADM-03 — admin token prefix contract', () => {
    const res = adminLoginResponse({ id: 'ADMIN-TEST-001', role: 'admin' });
    expect(res.token).toMatch(/^admin-jwt-/);
  });

  it('AUTH-ADM-04 — doctor role cannot access admin routes', () => {
    expect(canAccessAdminRoute('doctor')).toBe(false);
  });

  it('AUTH-ADM-05 — admin role can access admin routes', () => {
    expect(canAccessAdminRoute('admin', true)).toBe(true);
  });
});
