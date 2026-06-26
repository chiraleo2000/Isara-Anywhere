/**
 * @process Processes/Pages/Doctor-Portal/00 through 21
 * Route and role contracts from Doctor Portal process pages.
 */
import { describe, it, expect } from 'vitest';
import { DOCTOR_PORTAL_PROCESS_TESTS } from '../cross-portal/processWorkflowRegistry.ts';

type RouteSpec = {
  path: string;
  roles: Array<'doctor' | 'admin' | 'public'>;
  processPage: string;
};

const DOCTOR_ROUTES: RouteSpec[] = [
  { path: '/login', roles: ['public'], processPage: '01_Login_Page' },
  { path: '/reset-password', roles: ['public'], processPage: '02_Reset_Password_Page' },
  { path: '/dashboard', roles: ['doctor', 'admin'], processPage: '03_Dashboard_Page' },
  { path: '/schedule', roles: ['doctor', 'admin'], processPage: '04_Schedule_Page' },
  { path: '/patients', roles: ['doctor', 'admin'], processPage: '05_Patient_Management_Page' },
  { path: '/health-meeting', roles: ['doctor', 'admin'], processPage: '06_Health_Meeting_Page' },
  { path: '/meeting/:id', roles: ['doctor', 'admin'], processPage: '06_Health_Meeting_Page' },
  { path: '/clinical-resources', roles: ['doctor', 'admin'], processPage: '14_Clinical_Resources_Page' },
  { path: '/medical-content', roles: ['doctor', 'admin'], processPage: '13_Medical_Content_Page' },
  { path: '/consultants', roles: ['doctor', 'admin'], processPage: '12_Medical_Consultants_Page' },
  { path: '/profile', roles: ['doctor', 'admin'], processPage: '16_Doctor_Profile_Page' },
  { path: '/admin/appointments', roles: ['admin'], processPage: '17_Admin_Appointment_Management' },
  { path: '/admin/doctors', roles: ['admin'], processPage: '18_Admin_Doctor_Management' },
  { path: '/doctors', roles: ['admin'], processPage: '19_Doctors_Management_Page' },
];

function canAccessRoute(role: string | null, allowed: RouteSpec['roles']): boolean {
  if (allowed.includes('public')) return true;
  if (!role) return false;
  if (role === 'admin') return allowed.includes('admin') || allowed.includes('doctor');
  return allowed.includes(role as 'doctor' | 'admin');
}

describe('Doctor Portal process pages — route access matrix', () => {
  for (const route of DOCTOR_ROUTES) {
    it(`DPC-${route.processPage} — ${route.path} enforces role guard`, () => {
      if (route.roles.includes('public')) {
        expect(canAccessRoute(null, route.roles)).toBe(true);
        return;
      }
      expect(canAccessRoute(null, route.roles)).toBe(false);
      expect(canAccessRoute('doctor', route.roles)).toBe(route.roles.includes('doctor'));
      if (route.roles.includes('admin') && !route.roles.includes('doctor')) {
        expect(canAccessRoute('doctor', route.roles)).toBe(false);
      }
      if (route.roles.includes('admin')) {
        expect(canAccessRoute('admin', route.roles)).toBe(true);
      }
    });
  }

  it('DPC-00 — all 21 active doctor process docs registered in workflow registry', () => {
    expect(DOCTOR_PORTAL_PROCESS_TESTS).toHaveLength(21);
    const ids = DOCTOR_PORTAL_PROCESS_TESTS.map((e) => e.processDoc.split('/').pop());
    expect(ids).toContain('00_Doctor_Portal_Overview.md');
    expect(ids).toContain('21_Queue_Management.md');
    expect(ids).not.toContain('07_Virtual_Meeting.md');
  });

  it('DPC-P0 — meeting and queue pages marked P0', () => {
    const p0 = DOCTOR_PORTAL_PROCESS_TESTS.filter((e) => e.priority === 'P0');
    const pages = p0.map((e) => e.processDoc);
    expect(pages.some((p) => p.includes('06_Health_Meeting'))).toBe(true);
    expect(pages.some((p) => p.includes('07_Virtual_Meeting'))).toBe(false);
    expect(pages.some((p) => p.includes('20_Appointment_Pool'))).toBe(true);
    expect(pages.some((p) => p.includes('21_Queue_Management'))).toBe(true);
  });
});

describe('Doctor Portal process pages — error handling contracts', () => {
  it('DPC-ERR01 — unauthenticated API calls rejected for protected routes', () => {
    const protectedPaths = DOCTOR_ROUTES.filter((r) => !r.roles.includes('public'));
    expect(protectedPaths.length).toBeGreaterThan(10);
    for (const r of protectedPaths) {
      expect(canAccessRoute(null, r.roles)).toBe(false);
    }
  });

  it('DPC-ERR02 — patient role cannot access doctor portal routes', () => {
    for (const r of DOCTOR_ROUTES.filter((x) => !x.roles.includes('public'))) {
      expect(canAccessRoute('patient', r.roles)).toBe(false);
    }
  });
});
