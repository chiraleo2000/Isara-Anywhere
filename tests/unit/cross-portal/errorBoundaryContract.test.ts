/**
 * ErrorBoundary wiring contract
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');

describe('ErrorBoundary contract', () => {
  it('WHITE-01 — both portals wrap App with ErrorBoundary', () => {
    const doctorApp = fs.readFileSync(
      path.join(root, 'issara-doctor/frontend/App.tsx'),
      'utf8',
    );
    const patientApp = fs.readFileSync(
      path.join(root, 'issara-patient/frontend/App.tsx'),
      'utf8',
    );
    expect(doctorApp).toMatch(/<ErrorBoundary>/);
    expect(patientApp).toMatch(/<ErrorBoundary>/);
  });

  it('WHITE-02 — nested route boundaries on high-risk surfaces', () => {
    const doctorPortal = fs.readFileSync(
      path.join(root, 'issara-doctor/frontend/pages/DoctorPortal.tsx'),
      'utf8',
    );
    const patientLayout = fs.readFileSync(
      path.join(root, 'issara-patient/frontend/components/MainLayout.tsx'),
      'utf8',
    );
    expect(doctorPortal).toMatch(/RouteErrorBoundary|GuardedRoute/);
    expect(doctorPortal).toMatch(/health-meeting/);
    expect(doctorPortal).toMatch(/medical-content/);
    expect(patientLayout).toMatch(/RouteErrorBoundary/);
    expect(patientLayout).toMatch(/<Outlet/);
  });
});
