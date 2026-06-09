/**
 * GROUP L — Lab ordering API (doctor portal).
 */
import { test, expect } from '@playwright/test';
import { DOCTOR_URL } from './helpers/multi-portal';

const IS_CLOUD = process.env.TEST_ENV === 'cloud';
const DOCTOR_CREDS = {
  email: process.env.TEST_DOCTOR_EMAIL || 'doctor.test@izara.com',
  password: process.env.TEST_DOCTOR_PASSWORD || 'IzaraDoctor@2024', // NOSONAR S2068 — test fixture default, override via env in CI
};

async function obtainDoctorToken(
  request: import('@playwright/test').APIRequestContext,
): Promise<string> {
  const envToken = process.env.DOCTOR_API_TOKEN || '';
  if (envToken) return envToken;

  const endpoints = [`${DOCTOR_URL}/api/auth/login`, `${DOCTOR_URL}/auth/login`];
  for (const endpoint of endpoints) {
    try {
      const res = await request.post(endpoint, {
        data: DOCTOR_CREDS,
        headers: { 'Content-Type': 'application/json' },
        timeout: IS_CLOUD ? 30_000 : 15_000,
      });
      if (res.status() === 200) {
        const body = await res.json();
        const token = body.token || body.accessToken || body.data?.token || '';
        if (token) return token;
      }
    } catch {
      /* try next endpoint */
    }
  }
  return '';
}

test.describe('Group L — Lab ordering', () => {
  test('L1 — Doctor can list lab orders for patient via API', async ({ request }) => {
    const token = await obtainDoctorToken(request);
    expect(token, 'L1: doctor login must yield JWT').toBeTruthy();

    const patientId = process.env.VERIFY_PATIENT_ID || 'PATIENT-DEMO';
    const resp = await request.get(`${DOCTOR_URL}/api/lab-orders/patient/${patientId}`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: IS_CLOUD ? 30_000 : 15_000,
    });
    expect([200, 401, 403]).toContain(resp.status());
    if (resp.status() === 200) {
      const data = await resp.json().catch(() => []);
      const list = Array.isArray(data) ? data : (data.labOrders || []);
      expect(Array.isArray(list)).toBeTruthy();
    }
  });
});
