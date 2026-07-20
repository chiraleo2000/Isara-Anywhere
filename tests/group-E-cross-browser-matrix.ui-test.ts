/**
 * Group E supplement — documents cross-browser matrix expectations for Jitsi workflow.
 * Runs in E-meeting-clinical project via testMatch pattern in playwright.config.
 */
import { test, expect } from './helpers/multi-portal';
import {
  ROLE_BROWSER_MATRIX,
  getRoleBrowserSpec,
  scaleTimeout,
  scaleTimeoutByBrowser,
} from './helpers/browser-matrix';

test.describe('Group E — Cross-browser matrix guards', () => {
  test('EXB01 — fixture exposes role-specific browsers', async ({ portals }) => {
    const patientSpec = getRoleBrowserSpec('patient');
    const doctorSpec = getRoleBrowserSpec('doctor');
    const adminSpec = getRoleBrowserSpec('admin');

    expect(portals.patient.browserName).toBe(patientSpec.browserName);
    expect(portals.doctor.browserName).toBe(doctorSpec.browserName);
    expect(portals.admin.browserName).toBe(adminSpec.browserName);
  });

  test('EXB02 — meeting UI timeouts scale for Firefox (JIT-01)', () => {
    const chromeIframe = scaleTimeoutByBrowser(60_000, 'chrome');
    const firefoxIframe = scaleTimeoutByBrowser(60_000, 'firefox');
    expect(firefoxIframe).toBeGreaterThan(chromeIframe);
    expect(ROLE_BROWSER_MATRIX.admin.navTimeoutMultiplier).toBe(1.5);
    expect(getRoleBrowserSpec('admin').navTimeoutMultiplier).toBeGreaterThanOrEqual(1);
  });

  test('EXB03 — matrix defines all three portal roles', () => {
    expect(Object.keys(ROLE_BROWSER_MATRIX)).toHaveLength(3);
    const adminSpec = getRoleBrowserSpec('admin');
    expect(scaleTimeout(20_000, 'admin')).toBe(Math.round(20_000 * adminSpec.navTimeoutMultiplier));
    expect(ROLE_BROWSER_MATRIX.admin.navTimeoutMultiplier).toBe(1.5);
  });
});
