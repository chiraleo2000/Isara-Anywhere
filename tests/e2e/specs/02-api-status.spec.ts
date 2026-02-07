/**
 * =============================================================================
 * 02-API-STATUS — Exhaustive status-200 for ALL endpoints on both portals
 * =============================================================================
 * Covers: auth, appointments, PHR, health records, doctors, patients,
 *         consultants, clinical resources, medical content, notifications,
 *         video meeting, AI, metadata, PDPA, EMR, admin.
 *
 *   npx playwright test specs/02-api-status.spec.ts
 * =============================================================================
 */
import { test, expect, APIRequestContext } from '@playwright/test';
import {
  PATIENT_URL, DOCTOR_URL, MEETING_SERVER_URL,
  CREDENTIALS, getAuthToken, authHeaders, logTestSuccess, TIMEOUTS,
} from '../lib/test-config';

let ptk = ''; // patient token
let dtk = ''; // doctor token
let atk = ''; // admin token
const T = TIMEOUTS.api;

async function tokens(request: APIRequestContext) {
  if (!ptk) ptk = await getAuthToken(request, PATIENT_URL, CREDENTIALS.patient1);
  if (!dtk) dtk = await getAuthToken(request, DOCTOR_URL, CREDENTIALS.doctor);
  if (!atk) atk = await getAuthToken(request, DOCTOR_URL, CREDENTIALS.admin);
}

// ============ 1. AUTHENTICATION ============

test.describe('1. Authentication', () => {
  test('AUTH-01: Patient1 login', async ({ request }) => {
    const r = await request.post(`${PATIENT_URL}/api/auth/login`, {
      data: { email: CREDENTIALS.patient1.email, password: CREDENTIALS.patient1.password }, timeout: T });
    expect(r.status()).toBe(200);
    const b = await r.json(); ptk = b.token || b.accessToken || '';
    expect(ptk).toBeTruthy();
    logTestSuccess('Patient1 login OK');
  });

  test('AUTH-02: Patient2 login', async ({ request }) => {
    const r = await request.post(`${PATIENT_URL}/api/auth/login`, {
      data: { email: CREDENTIALS.patient2.email, password: CREDENTIALS.patient2.password }, timeout: T });
    expect(r.status()).toBe(200);
    logTestSuccess('Patient2 login OK');
  });

  test('AUTH-03: Patient3 login', async ({ request }) => {
    const r = await request.post(`${PATIENT_URL}/api/auth/login`, {
      data: { email: CREDENTIALS.patient3.email, password: CREDENTIALS.patient3.password }, timeout: T });
    expect(r.status()).toBe(200);
    logTestSuccess('Patient3 login OK');
  });

  test('AUTH-04: Doctor login', async ({ request }) => {
    const r = await request.post(`${DOCTOR_URL}/api/auth/login`, {
      data: { email: CREDENTIALS.doctor.email, password: CREDENTIALS.doctor.password }, timeout: T });
    expect(r.status()).toBe(200);
    const b = await r.json(); dtk = b.token || b.accessToken || '';
    expect(dtk).toBeTruthy();
    logTestSuccess('Doctor login OK');
  });

  test('AUTH-05: Admin login', async ({ request }) => {
    const r = await request.post(`${DOCTOR_URL}/api/auth/login`, {
      data: { email: CREDENTIALS.admin.email, password: CREDENTIALS.admin.password }, timeout: T });
    expect(r.status()).toBe(200);
    const b = await r.json(); atk = b.token || b.accessToken || '';
    expect(atk).toBeTruthy();
    logTestSuccess('Admin login OK');
  });
});

// ============ 2. PATIENT PORTAL ENDPOINTS ============

test.describe('2. Patient Portal API', () => {
  test.beforeAll(async ({ request }) => { await tokens(request); });
  const ph = () => authHeaders(ptk);

  test('PAT-01: /api/appointments', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/appointments`, { headers: ph(), timeout: T });
    expect(r.status()).toBe(200); logTestSuccess('Appointments OK');
  });
  test('PAT-02: /api/phr', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/phr`, { headers: ph(), timeout: T });
    expect(r.status()).toBe(200); logTestSuccess('PHR OK');
  });
  test('PAT-03: /api/doctors', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/doctors`, { headers: ph(), timeout: T });
    expect(r.status()).toBe(200); logTestSuccess('Doctors list OK');
  });
  test('PAT-04: /api/consultants', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/consultants`, { timeout: T });
    expect(r.status()).toBe(200); logTestSuccess('Consultants OK');
  });
  test('PAT-05: /api/notifications', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/notifications`, { headers: ph(), timeout: T });
    expect(r.status()).toBe(200); logTestSuccess('Notifications OK');
  });
  test('PAT-06: /api/medical-content', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/medical-content`, { timeout: T });
    expect(r.status()).toBe(200); logTestSuccess('Medical content OK');
  });
  test('PAT-07: /api/content/medical', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/content/medical`, { timeout: T });
    expect(r.status()).toBe(200); logTestSuccess('Content medical OK');
  });
  test('PAT-08: /api/users/profile', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/users/profile`, { headers: ph(), timeout: T });
    expect(r.status()).toBe(200); logTestSuccess('User profile OK');
  });
  test('PAT-09: /api/timeline', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/timeline`, { headers: ph(), timeout: T });
    expect(r.status()).toBe(200); logTestSuccess('Timeline OK');
  });
  test('PAT-10: /api/health-records/treatment-results', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/health-records/treatment-results`, { headers: ph(), timeout: T });
    expect(r.status()).toBe(200); logTestSuccess('Treatment results OK');
  });
  test('PAT-11: /api/video-meeting/config', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/video-meeting/config`, { timeout: T });
    expect(r.status()).toBe(200); logTestSuccess('Video meeting config OK');
  });
  test('PAT-12: /api/video-meeting/health', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/video-meeting/health`, { timeout: T });
    expect(r.status()).toBe(200); logTestSuccess('Video meeting health OK');
  });
  test('PAT-13: /api/ai/status', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/ai/status`, { timeout: T });
    expect(r.status()).toBe(200); logTestSuccess('AI status OK');
  });
  test('PAT-14: /api/content/health-tips', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/content/health-tips`, { timeout: T });
    expect(r.status()).toBe(200); logTestSuccess('Content health tips OK');
  });
  test('PAT-15: /api/health-records', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/health-records`, { headers: ph(), timeout: T });
    expect(r.status()).toBe(200); logTestSuccess('Health records OK');
  });
});

// ============ 3. DOCTOR PORTAL ENDPOINTS ============

test.describe('3. Doctor Portal API', () => {
  test.beforeAll(async ({ request }) => { await tokens(request); });
  const dh = () => authHeaders(dtk);

  test('DOC-01: /api/patients', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/patients`, { headers: dh(), timeout: T });
    expect(r.status()).toBe(200); logTestSuccess('Doc patients OK');
  });
  test('DOC-02: /api/appointments', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/appointments`, { headers: dh(), timeout: T });
    expect(r.status()).toBe(200); logTestSuccess('Doc appointments OK');
  });
  test('DOC-03: /api/clinical-resources', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/clinical-resources`, { headers: dh(), timeout: T });
    expect(r.status()).toBe(200); logTestSuccess('Clinical resources OK');
  });
  test('DOC-04: /api/medical-content', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/medical-content`, { headers: dh(), timeout: T });
    expect(r.status()).toBe(200); logTestSuccess('Doc medical content OK');
  });
  test('DOC-05: /api/consultants', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/consultants`, { timeout: T });
    expect(r.status()).toBe(200); logTestSuccess('Doc consultants OK');
  });
  test('DOC-06: /api/notifications', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/notifications`, { headers: dh(), timeout: T });
    expect(r.status()).toBe(200); logTestSuccess('Doc notifications OK');
  });
  test('DOC-07: /api/video-meeting/health', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/video-meeting/health`, { timeout: T });
    expect(r.status()).toBe(200); logTestSuccess('Doc video health OK');
  });
  test('DOC-08: /api/content/medical', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/content/medical`, { timeout: T });
    expect(r.status()).toBe(200); logTestSuccess('Doc content medical OK');
  });
  test('DOC-09: /api/content/clinical', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/content/clinical`, { timeout: T });
    expect(r.status()).toBe(200); logTestSuccess('Doc content clinical OK');
  });
  test('DOC-10: /api/metadata/medications', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/metadata/medications`, { timeout: T });
    expect(r.status()).toBe(200); logTestSuccess('Doc medications OK');
  });
  test('DOC-11: /api/metadata/lab-tests', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/metadata/lab-tests`, { timeout: T });
    expect(r.status()).toBe(200); logTestSuccess('Doc lab tests OK');
  });
  test('DOC-12: /api/metadata/icd10-codes', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/metadata/icd10-codes`, { timeout: T });
    expect(r.status()).toBe(200); logTestSuccess('Doc ICD-10 codes OK');
  });
  test('DOC-13: /api/ai/health', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/ai/health`, { timeout: T });
    expect(r.status()).toBe(200); logTestSuccess('Doc AI health OK');
  });
  test('DOC-14: /api/emr', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/emr`, { headers: dh(), timeout: T });
    expect(r.status()).toBe(200); logTestSuccess('Doc EMR list OK');
  });
  test('DOC-15: /api/metadata/drug-interactions', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/metadata/drug-interactions`, { timeout: T });
    expect(r.status()).toBe(200); logTestSuccess('Doc drug interactions OK');
  });
});

// ============ 4. ADMIN ENDPOINTS ============

test.describe('4. Admin Portal API', () => {
  test.beforeAll(async ({ request }) => { await tokens(request); });
  const ah = () => authHeaders(atk);

  test('ADM-01: /api/patients', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/patients`, { headers: ah(), timeout: T });
    expect(r.status()).toBe(200); logTestSuccess('Admin patients OK');
  });
  test('ADM-02: /api/appointments', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/appointments`, { headers: ah(), timeout: T });
    expect(r.status()).toBe(200); logTestSuccess('Admin appointments OK');
  });
  test('ADM-03: /api/admin/users', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/admin/users`, { headers: ah(), timeout: T });
    expect(r.status()).toBe(200); logTestSuccess('Admin users list OK');
  });
  test('ADM-04: /api/admin/pending-doctors', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/admin/pending-doctors`, { headers: ah(), timeout: T });
    expect(r.status()).toBe(200); logTestSuccess('Admin pending doctors OK');
  });
  test('ADM-05: /api/clinical-resources', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/clinical-resources`, { headers: ah(), timeout: T });
    expect(r.status()).toBe(200); logTestSuccess('Admin clinical resources OK');
  });
  test('ADM-06: /api/notifications', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/notifications`, { headers: ah(), timeout: T });
    expect(r.status()).toBe(200); logTestSuccess('Admin notifications OK');
  });
});

// ============ 5. MEETING SERVER ============

test.describe('5. Meeting Server', () => {
  test('MEET-01: /health', async ({ request }) => {
    const r = await request.get(`${MEETING_SERVER_URL}/health`, { timeout: T });
    expect(r.status()).toBe(200); logTestSuccess('Meeting health OK');
  });
  test('MEET-02: /api/health', async ({ request }) => {
    const r = await request.get(`${MEETING_SERVER_URL}/api/health`, { timeout: T });
    expect(r.status()).toBe(200); logTestSuccess('Meeting API health OK');
  });
});
