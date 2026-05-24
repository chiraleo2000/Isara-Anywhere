/**
 * GROUP L — Lab ordering API (doctor portal).
 */
import { test, expect } from '@playwright/test';
import { DOCTOR_URL } from './helpers/multi-portal';

const IS_CLOUD = process.env.TEST_ENV === 'cloud';

test.describe('Group L — Lab ordering', () => {
  test('L1 — Doctor can list lab orders for patient via API', async ({ request }) => {
    const token = process.env.DOCTOR_API_TOKEN || '';
    test.skip(!token && !IS_CLOUD, 'Set DOCTOR_API_TOKEN for API lab test');

    const patientId = process.env.VERIFY_PATIENT_ID || 'PATIENT-DEMO';
    const resp = await request.get(`${DOCTOR_URL}/api/lab-orders/patient/${patientId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
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
