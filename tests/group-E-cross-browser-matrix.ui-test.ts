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
  test('EXB01 — fixture exposes Chrome/Chrome/Firefox roles', async ({ portals }) => {
    expect(portals.patient.browserName).toBe('chrome');
    // Runtime browser label is Chromium-family even when Edge channel is used.
    expect(portals.doctor.browserName).toBe('chrome');
    expect(portals.admin.browserName).toBe('firefox');
  });

  test('EXB02 — meeting UI timeouts scale for Firefox (JIT-01)', () => {
    const chromeIframe = scaleTimeoutByBrowser(60_000, 'chrome');
    const firefoxIframe = scaleTimeoutByBrowser(60_000, 'firefox');
    expect(firefoxIframe).toBeGreaterThan(chromeIframe);
    expect(getRoleBrowserSpec('admin').navTimeoutMultiplier).toBe(1.5);
  });

  test('EXB03 — matrix defines all three portal roles', () => {
    expect(Object.keys(ROLE_BROWSER_MATRIX)).toHaveLength(3);
    expect(scaleTimeout(20_000, 'admin')).toBe(30_000);
  });
});
