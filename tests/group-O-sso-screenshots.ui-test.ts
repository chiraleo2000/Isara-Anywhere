/**
 * GROUP O - SSO UI SCREENSHOT CAPTURE
 *
 *   O1 patient-login-with-google.png
 *   O2 doctor-login-with-google.png
 *   O3 sso-redirect-to-register.png
 *   O4 sso-doctor-pending-approval.png
 *   O5 sso-success-dashboard-patient.png   (best-effort; skipped if backend lacks fixture)
 *   O6 sso-success-dashboard-doctor.png    (best-effort)
 *
 * Outputs are saved to THREE locations as requested:
 *   - docs/screenshots/sso/
 *   - screenshots/sso/
 *   - Presentations/media/sso/
 */
import { test } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { PATIENT_URL, DOCTOR_URL } from './helpers/multi-portal';

const OUTPUT_DIRS = [
  path.join(process.cwd(), 'docs', 'screenshots', 'sso'),
  path.join(process.cwd(), 'screenshots', 'sso'),
  path.join(process.cwd(), 'Presentations', 'media', 'sso'),
];

function ensureDirs() {
  for (const d of OUTPUT_DIRS) fs.mkdirSync(d, { recursive: true });
}

async function snap(page: import('@playwright/test').Page, name: string) {
  ensureDirs();
  const buf = await page.screenshot({ fullPage: true });
  for (const d of OUTPUT_DIRS) fs.writeFileSync(path.join(d, name), buf);
}

test.describe('Group O - SSO UI screenshots', () => {

  test('O1 - patient login with Google button', async ({ page }) => {
    await page.goto(`${PATIENT_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.locator('[data-testid="google-sso-container"]').waitFor({ state: 'visible', timeout: 45_000 });
    await snap(page, 'patient-login-with-google.png');
  });

  test('O2 - doctor login with Google button', async ({ page }) => {
    await page.goto(`${DOCTOR_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.locator('[data-testid="google-sso-container"]').waitFor({ state: 'visible', timeout: 45_000 });
    await snap(page, 'doctor-login-with-google.png');
  });

  test('O3 - SSO unknown email redirect to register', async ({ page }) => {
    const email = `unknown-${Date.now()}@izara.test`;
    await page.route('**/api/auth/google-auth', (r) =>
      r.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'NOT_REGISTERED', email, error: 'not_registered' }),
      })
    );
    await page.goto(`${PATIENT_URL}/register?email=${encodeURIComponent(email)}&source=google`);
    await page.waitForSelector('[data-testid="sso-register-banner"]', { timeout: 10_000 });
    await snap(page, 'sso-redirect-to-register.png');
  });

  test('O4 - doctor SSO pending approval message', async ({ page }) => {
    await page.route('**/auth/google-auth', (r) =>
      r.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'PENDING_APPROVAL', error: 'pending_approval', message: 'Account pending approval' }),
      })
    );
    await page.goto(`${DOCTOR_URL}/login`);
    await page.waitForLoadState('networkidle').catch(() => {});
    await snap(page, 'sso-doctor-pending-approval.png');
  });
});
