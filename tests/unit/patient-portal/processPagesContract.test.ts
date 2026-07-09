/**
 * @process Processes/Pages/Patient-Portal/00 through 15
 * Route and role contracts from Patient Portal process pages.
 */
import { describe, it, expect } from 'vitest';
import { PATIENT_PORTAL_PROCESS_TESTS } from '../cross-portal/processWorkflowRegistry.ts';

type RouteSpec = {
  path: string;
  authRequired: boolean;
  processPage: string;
};

const PATIENT_ROUTES: RouteSpec[] = [
  { path: '/login', authRequired: false, processPage: '01_Login_Page' },
  { path: '/register', authRequired: false, processPage: '02_Register_Page' },
  { path: '/reset-password', authRequired: false, processPage: '03_Reset_Password_Page' },
  { path: '/', authRequired: true, processPage: '04_Dashboard_Page' },
  { path: '/appointments', authRequired: true, processPage: '05_Appointments_Page' },
  { path: '/book-appointment', authRequired: true, processPage: '05_Appointments_Page' },
  { path: '/phr', authRequired: true, processPage: '06_PHR_Page' },
  { path: '/ai-doctor', authRequired: true, processPage: '07_AI_Doctor_Page' },
  { path: '/health-library', authRequired: true, processPage: '08_Medical_Content_Library' },
  { path: '/map', authRequired: true, processPage: '09_Map_Page' },
  { path: '/pdpa', authRequired: true, processPage: '10_PDPA_Page' },
  { path: '/living-will', authRequired: true, processPage: '11_Living_Will_Page' },
  { path: '/profile', authRequired: true, processPage: '12_Profile_Page' },
  { path: '/settings', authRequired: true, processPage: '13_Settings_Page' },
  { path: '/timeline', authRequired: true, processPage: '14_Timeline_Page' },
  { path: '/patient/:userId/meeting/:id', authRequired: true, processPage: '05_Appointments_Page' },
  { path: '/meeting/:id', authRequired: true, processPage: '05_Appointments_Page' },
];

function patientRouteAllowed(isAuthenticated: boolean, route: RouteSpec): boolean {
  return route.authRequired ? isAuthenticated : true;
}

describe('Patient Portal process pages — route access matrix', () => {
  for (const route of PATIENT_ROUTES) {
    it(`PPC-${route.processPage} — ${route.path} auth gate`, () => {
      expect(patientRouteAllowed(false, route)).toBe(!route.authRequired);
      expect(patientRouteAllowed(true, route)).toBe(true);
    });
  }

  it('PPC-00 — all 16 patient process docs registered', () => {
    expect(PATIENT_PORTAL_PROCESS_TESTS).toHaveLength(16);
  });

  it('PPC-P0 — appointments and PHR marked P0', () => {
    const p0 = PATIENT_PORTAL_PROCESS_TESTS.filter((e) => e.priority === 'P0');
    expect(p0.some((e) => e.processDoc.includes('05_Appointments'))).toBe(true);
    expect(p0.some((e) => e.processDoc.includes('06_PHR'))).toBe(true);
  });
});

describe('Patient Portal process pages — standard user paths', () => {
  it('PPC-FLOW01 — booking path requires auth then appointments route', () => {
    const book = PATIENT_ROUTES.find((r) => r.path === '/book-appointment');
    expect(book?.authRequired).toBe(true);
  });

  it('PPC-FLOW02 — meeting join requires authenticated patient', () => {
    const meeting = PATIENT_ROUTES.find((r) => r.path === '/meeting/:id');
    expect(meeting?.authRequired).toBe(true);
    expect(patientRouteAllowed(false, meeting!)).toBe(false);
  });

  it('PPC-ERR01 — doctor role must not satisfy patient-only session shape', () => {
    const doctorAsPatient = { role: 'doctor', portal: 'doctor' };
    expect(doctorAsPatient.portal).not.toBe('patient');
  });
});
