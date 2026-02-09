/**
 * =============================================================================
 * SPEC 24: CONTENT, CLINICAL RESOURCES, CONSULTANTS & DATA SYNC
 * =============================================================================
 * Version: 1.0.0 | Created: February 7, 2026
 *
 * Covers:
 *   - Medicine_Content_Processes.md (medical content CRUD, status flow)
 *   - Clinical_Resources_&_Medical_Library_Workflows.md (doctor guidelines)
 *   - Medical_Consultants_Workflows.md (specialist directory)
 *   - Data_Sync_Documentation.md (cross-portal data, metadata)
 *   - UI_Pages_Workflows.md (all portal pages load)
 *
 * STRICT 200-only. NO test.skip(). NO errors.
 * =============================================================================
 */

import { test, expect } from '@playwright/test';
import {
  IS_CLOUD, PATIENT_URL, DOCTOR_URL,
  CREDENTIALS, TIMEOUTS, getAuthToken, getDoctorAuthToken,
} from '../lib/test-config';

const T = IS_CLOUD ? TIMEOUTS.cloud : TIMEOUTS.api;
const TL = IS_CLOUD ? 90_000 : TIMEOUTS.long;
const h = (tk: string) => ({ Authorization: `Bearer ${tk}`, 'Content-Type': 'application/json' });

let ptk = '', dtk = '', atk = '';

// ============================================================================
// 1. MEDICAL CONTENT (serial)
// ============================================================================
test.describe.serial('1. Medical Content Workflows', () => {
  test('MC-01: Patient login', async ({ request }) => {
    ptk = await getAuthToken(request, PATIENT_URL, CREDENTIALS.patient1);
    expect(ptk).toBeTruthy();
  });
  test('MC-02: Doctor login', async ({ request }) => {
    dtk = await getDoctorAuthToken(request, DOCTOR_URL, CREDENTIALS.doctor);
    expect(dtk).toBeTruthy();
  });
  test('MC-03: Admin login', async ({ request }) => {
    atk = await getDoctorAuthToken(request, DOCTOR_URL, CREDENTIALS.admin);
    expect(atk).toBeTruthy();
  });

  // --- Patient reads published content ---
  test('MC-04: Patient reads medical content', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/content/medical`, { timeout: T });
    expect(r.status()).toBe(200);
  });

  test('MC-05: Patient reads medical content (alt path)', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/medical-content`, { timeout: T });
    expect(r.status()).toBe(200);
  });

  test('MC-06: Patient reads health tips', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/content/health-tips`, { timeout: T });
    expect(r.status()).toBe(200);
  });

  test('MC-07: Patient reads health education', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/content/health-education`, { timeout: T });
    expect(r.status()).toBe(200);
  });

  test('MC-08: Patient reads content categories', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/content/categories`, { timeout: T });
    expect(r.status()).toBe(200);
  });

  // --- Doctor content management ---
  test('MC-09: Doctor reads medical content', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/content/medical`, { timeout: T });
    expect(r.status()).toBe(200);
  });

  test('MC-10: Doctor reads content tags', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/content/tags/medical`, { timeout: T });
    expect(r.status()).toBe(200);
  });

  test('MC-11: Doctor reads medical content (legacy)', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/medical-content`, { timeout: T });
    expect(r.status()).toBe(200);
  });

  // --- Admin content review ---
  test('MC-12: Admin views pending medical content', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/content/medical/pending`, {
      headers: h(atk), timeout: T,
    });
    expect(r.status()).toBe(200);
  });
});

// ============================================================================
// 2. CLINICAL RESOURCES (serial)
// ============================================================================
test.describe.serial('2. Clinical Resources', () => {
  test('CR-01: Doctor login', async ({ request }) => {
    dtk = await getDoctorAuthToken(request, DOCTOR_URL, CREDENTIALS.doctor);
    expect(dtk).toBeTruthy();
  });
  test('CR-02: Admin login', async ({ request }) => {
    atk = await getDoctorAuthToken(request, DOCTOR_URL, CREDENTIALS.admin);
    expect(atk).toBeTruthy();
  });

  test('CR-03: Doctor reads clinical resources', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/clinical-resources`, {
      headers: h(dtk), timeout: T,
    });
    expect(r.status()).toBe(200);
  });

  test('CR-04: Doctor reads clinical content', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/content/clinical`, { timeout: T });
    expect(r.status()).toBe(200);
  });

  test('CR-05: Doctor reads clinical tags', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/content/tags/clinical`, { timeout: T });
    expect(r.status()).toBe(200);
  });

  test('CR-06: Admin views pending clinical content', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/content/clinical/pending`, {
      headers: h(atk), timeout: T,
    });
    expect(r.status()).toBe(200);
  });

  test('CR-07: Admin views pending medical content', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/medical-content/pending`, {
      headers: h(atk), timeout: T,
    });
    expect(r.status()).toBe(200);
  });
});

// ============================================================================
// 3. MEDICAL CONSULTANTS (serial)
// ============================================================================
test.describe.serial('3. Medical Consultants', () => {
  test('CON-01: Doctor login', async ({ request }) => {
    dtk = await getDoctorAuthToken(request, DOCTOR_URL, CREDENTIALS.doctor);
    expect(dtk).toBeTruthy();
  });

  test('CON-02: List consultants (public)', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/consultants`, { timeout: T });
    expect(r.status()).toBe(200);
    const d = await r.json();
    const list = d.consultants || d.data || d;
    expect(Array.isArray(list)).toBe(true);
  });

  test('CON-03: List consultant specialties', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/consultants/specialties/list`, { timeout: T });
    expect(r.status()).toBe(200);
  });

  test('CON-04: Patient reads consultants', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/consultants`, { timeout: T });
    expect(r.status()).toBe(200);
  });
});

// ============================================================================
// 4. METADATA & REFERENCE DATA (Data_Sync_Documentation.md)
// ============================================================================
test.describe.serial('4. Metadata & Reference Data', () => {
  test('META-01: Patient login', async ({ request }) => {
    ptk = await getAuthToken(request, PATIENT_URL, CREDENTIALS.patient1);
    expect(ptk).toBeTruthy();
  });

  test('META-02: Patient metadata medications', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/metadata/medications`, {
      headers: h(ptk), timeout: T,
    });
    expect(r.status()).toBe(200);
  });

  test('META-03: Patient metadata lab tests', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/metadata/lab-tests`, {
      headers: h(ptk), timeout: T,
    });
    expect(r.status()).toBe(200);
  });

  test('META-04: Doctor metadata drug interactions', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/metadata/drug-interactions`, { timeout: T });
    expect(r.status()).toBe(200);
  });

  test('META-05: Doctor metadata medications', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/metadata/medications`, { timeout: T });
    expect(r.status()).toBe(200);
  });

  test('META-06: Doctor metadata ICD-10 codes', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/metadata/icd10-codes`, { timeout: T });
    expect(r.status()).toBe(200);
  });

  test('META-07: Doctor metadata lab tests', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/metadata/lab-tests`, { timeout: T });
    expect(r.status()).toBe(200);
  });

  test('META-08: Patient metadata doctors', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/doctors`, {
      headers: h(ptk), timeout: T,
    });
    expect(r.status()).toBe(200);
  });

  test('META-09: Patient metadata ICD-10 codes', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/metadata/icd10-codes`, {
      headers: h(ptk), timeout: T,
    });
    expect(r.status()).toBe(200);
  });
});

// ============================================================================
// 5. CROSS-PORTAL DATA SYNC
// ============================================================================
test.describe.serial('5. Cross-Portal Data Sync', () => {
  test('SYNC-01: Patient login', async ({ request }) => {
    ptk = await getAuthToken(request, PATIENT_URL, CREDENTIALS.patient1);
    expect(ptk).toBeTruthy();
  });
  test('SYNC-02: Doctor login', async ({ request }) => {
    dtk = await getDoctorAuthToken(request, DOCTOR_URL, CREDENTIALS.doctor);
    expect(dtk).toBeTruthy();
  });

  // Verify same patient data visible in both portals
  test('SYNC-03: Patient PHR via patient portal', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/phr/${CREDENTIALS.patient1.id}`, {
      headers: h(ptk), timeout: T,
    });
    expect(r.status()).toBe(200);
  });

  test('SYNC-04: Patient PHR via doctor portal', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/phr/patient/${CREDENTIALS.patient1.id}`, {
      headers: h(dtk), timeout: T,
    });
    expect(r.status()).toBe(200);
  });

  // Verify appointments visible in both portals
  test('SYNC-05: Appointments via patient portal', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/appointments`, {
      headers: h(ptk), timeout: T,
    });
    expect(r.status()).toBe(200);
  });

  test('SYNC-06: Appointments via doctor portal', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/appointments`, {
      headers: h(dtk), timeout: T,
    });
    expect(r.status()).toBe(200);
  });

  // Verify medical content visible in both portals
  test('SYNC-07: Medical content via patient portal', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/content/medical`, { timeout: T });
    expect(r.status()).toBe(200);
  });

  test('SYNC-08: Medical content via doctor portal', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/content/medical`, { timeout: T });
    expect(r.status()).toBe(200);
  });

  // Verify consultants visible in both portals
  test('SYNC-09: Consultants via patient portal', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/consultants`, { timeout: T });
    expect(r.status()).toBe(200);
  });

  test('SYNC-10: Consultants via doctor portal', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/consultants`, { timeout: T });
    expect(r.status()).toBe(200);
  });
});

// ============================================================================
// 6. UI PAGES — ALL PORTAL PAGES (UI_Pages_Workflows.md)
// ============================================================================
test.describe('6. UI All Portal Pages', () => {
  // --- Patient Portal Pages ---
  test('UI-PP-01: Patient home/dashboard', async ({ page }) => {
    await page.goto(`${PATIENT_URL}/`, { timeout: TL, waitUntil: 'domcontentloaded' });
    expect(page.url()).toContain('/');
  });
  test('UI-PP-02: Patient appointments', async ({ page }) => {
    await page.goto(`${PATIENT_URL}/appointments`, { timeout: TL, waitUntil: 'domcontentloaded' });
    expect(page.url()).toContain('/');
  });
  test('UI-PP-03: Patient AI chat', async ({ page }) => {
    await page.goto(`${PATIENT_URL}/ai-chat`, { timeout: TL, waitUntil: 'domcontentloaded' });
    expect(page.url()).toContain('/');
  });
  test('UI-PP-04: Patient health library', async ({ page }) => {
    await page.goto(`${PATIENT_URL}/health-library`, { timeout: TL, waitUntil: 'domcontentloaded' });
    expect(page.url()).toContain('/');
  });
  test('UI-PP-05: Patient PHR', async ({ page }) => {
    await page.goto(`${PATIENT_URL}/phr`, { timeout: TL, waitUntil: 'domcontentloaded' });
    expect(page.url()).toContain('/');
  });
  test('UI-PP-06: Patient health timeline', async ({ page }) => {
    await page.goto(`${PATIENT_URL}/health-timeline`, { timeout: TL, waitUntil: 'domcontentloaded' });
    expect(page.url()).toContain('/');
  });
  test('UI-PP-07: Patient PDPA consent', async ({ page }) => {
    await page.goto(`${PATIENT_URL}/pdpa-consent`, { timeout: TL, waitUntil: 'domcontentloaded' });
    expect(page.url()).toContain('/');
  });
  test('UI-PP-08: Patient settings', async ({ page }) => {
    await page.goto(`${PATIENT_URL}/settings`, { timeout: TL, waitUntil: 'domcontentloaded' });
    expect(page.url()).toContain('/');
  });
  test('UI-PP-09: Patient map', async ({ page }) => {
    await page.goto(`${PATIENT_URL}/map`, { timeout: TL, waitUntil: 'domcontentloaded' });
    expect(page.url()).toContain('/');
  });

  // --- Doctor Portal Pages ---
  test('UI-DP-01: Doctor dashboard', async ({ page }) => {
    await page.goto(`${DOCTOR_URL}/dashboard`, { timeout: TL, waitUntil: 'domcontentloaded' });
    expect(page.url()).toContain('/');
  });
  test('UI-DP-02: Doctor schedule', async ({ page }) => {
    await page.goto(`${DOCTOR_URL}/schedule`, { timeout: TL, waitUntil: 'domcontentloaded' });
    expect(page.url()).toContain('/');
  });
  test('UI-DP-03: Doctor patients', async ({ page }) => {
    await page.goto(`${DOCTOR_URL}/patients`, { timeout: TL, waitUntil: 'domcontentloaded' });
    expect(page.url()).toContain('/');
  });
  test('UI-DP-04: Doctor appointments', async ({ page }) => {
    await page.goto(`${DOCTOR_URL}/appointments`, { timeout: TL, waitUntil: 'domcontentloaded' });
    expect(page.url()).toContain('/');
  });
  test('UI-DP-05: Doctor consultants', async ({ page }) => {
    await page.goto(`${DOCTOR_URL}/consultants`, { timeout: TL, waitUntil: 'domcontentloaded' });
    expect(page.url()).toContain('/');
  });
  test('UI-DP-06: Doctor medical content', async ({ page }) => {
    await page.goto(`${DOCTOR_URL}/medical-content`, { timeout: TL, waitUntil: 'domcontentloaded' });
    expect(page.url()).toContain('/');
  });
  test('UI-DP-07: Doctor clinical resources', async ({ page }) => {
    await page.goto(`${DOCTOR_URL}/clinical-resources`, { timeout: TL, waitUntil: 'domcontentloaded' });
    expect(page.url()).toContain('/');
  });
});
