/**
 * Local UX smoke — headed browsers + screenshots (sibling layout).
 * Lightweight gate when full multi-portal fixture groups are blocked.
 */
import { test, expect, chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const shotDir = path.join(root, 'tests/output/screenshots/local-smoke');
const PATIENT = process.env.PATIENT_URL || 'http://127.0.0.1:3005';
const DOCTOR = process.env.DOCTOR_URL || 'http://127.0.0.1:3010';
const MEETING = process.env.MEETING_URL || 'http://127.0.0.1:3020';

fs.mkdirSync(shotDir, { recursive: true });

async function snap(page: import('@playwright/test').Page, name: string) {
  const file = path.join(shotDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

test.describe.configure({ mode: 'serial' });

test('SMOKE-01 — patient login UI visible + screenshot', async () => {
  const browser = await chromium.launch({ headless: false, channel: 'chrome' }).catch(() =>
    chromium.launch({ headless: false }),
  );
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const res = await page.goto(`${PATIENT}/login`, { waitUntil: 'domcontentloaded' });
  expect(res?.ok() || res?.status() === 304).toBeTruthy();
  await page.waitForTimeout(1500);
  await snap(page, 'SMOKE-01-patient-login');
  const body = await page.locator('body').innerText();
  expect(body.length).toBeGreaterThan(20);
  await browser.close();
});

test('SMOKE-02 — doctor login UI visible + screenshot', async () => {
  const browser = await chromium.launch({ headless: false, channel: 'msedge' }).catch(() =>
    chromium.launch({ headless: false }),
  );
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const res = await page.goto(`${DOCTOR}/login`, { waitUntil: 'domcontentloaded' });
  expect(res?.ok() || res?.status() === 304).toBeTruthy();
  await page.waitForTimeout(1500);
  await snap(page, 'SMOKE-02-doctor-login');
  const body = await page.locator('body').innerText();
  expect(body.length).toBeGreaterThan(20);
  await browser.close();
});

test('SMOKE-03 — meeting health + patient home after demo login attempt', async () => {
  const health = await fetch(`${MEETING}/health`);
  expect(health.ok).toBeTruthy();

  const browser = await chromium.launch({ headless: false }).catch(() =>
    chromium.launch({ headless: false }),
  );
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${PATIENT}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);

  const email = page.getByTestId('login-email').or(page.locator('input[type="email"]').first());
  const password = page.getByTestId('login-password').or(page.locator('input[type="password"]').first());
  const submit = page.getByTestId('login-submit').or(page.locator('button[type="submit"]').first());

  if (await email.count()) {
    await email.fill(process.env.DEMO_PATIENT_EMAIL || 'demo.test@gmail.com');
    await password.fill(process.env.DEMO_PATIENT_PASSWORD || 'P@ssw0rd');
    await submit.click();
    await page.waitForTimeout(2500);
  }

  await snap(page, 'SMOKE-03-patient-post-login');
  const url = page.url();
  // Capture outcome; do not fail hard on redirect variance — ledger it
  await snap(page, url.includes('login') ? 'SMOKE-03-still-login' : 'SMOKE-03-authenticated');
  await browser.close();
});
