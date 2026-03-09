/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SPEC 28C: API HEALTH CHECKS VERIFICATION
 * ═══════════════════════════════════════════════════════════════════════════════
 * Tests: 8 | API-only health checks (no browser needed), verifies all endpoints.
 * Split from spec 28 to prevent worker cascade skips across blocks.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import { test, expect } from '@playwright/test';
import {
  ENDPOINTS,
  authenticateAllUsers,
  patientApi, doctorApi, meetingApi,
  logTestSuccess, logTestInfo,
  type UserRole, type AuthenticatedUser,
} from '../lib/test-helpers';

test.describe('28C — API Health Checks', () => {
  let users: Map<UserRole, AuthenticatedUser>;

  test.beforeAll(async ({ request }) => {
    users = await authenticateAllUsers(request);
    logTestInfo('Auth OK for health checks');
  });

  test('C01 — Patient Portal health returns 200', async ({ request }) => {
    const p1 = users.get('patient1')!;
    const res = await patientApi(request, p1.token).get(ENDPOINTS.health);
    expect(res.status).toBe(200);
    logTestSuccess('Patient portal health: 200');
  });

  test('C02 — Doctor Portal health returns 200', async ({ request }) => {
    const doc = users.get('doctor')!;
    const res = await doctorApi(request, doc.token).get('/health');
    expect(res.status).toBe(200);
    logTestSuccess('Doctor portal health: 200');
  });

  test('C03 — Meeting Server health returns 200', async ({ request }) => {
    const doc = users.get('doctor')!;
    const res = await meetingApi(request, doc.token).get(ENDPOINTS.meetings.health);
    expect(res.status).toBe(200);
    logTestSuccess('Meeting server health: 200');
  });

  test('C04 — Patient appointments API returns 200', async ({ request }) => {
    const p1 = users.get('patient1')!;
    const res = await patientApi(request, p1.token).get(ENDPOINTS.appointments);
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);
    logTestSuccess('Appointments API OK');
  });

  test('C05 — Patient medical content API returns 200', async ({ request }) => {
    const p1 = users.get('patient1')!;
    const res = await patientApi(request, p1.token).get(ENDPOINTS.medicalContent);
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);
    logTestSuccess('Medical content API OK');
  });

  test('C06 — Patient PHR API returns 200', async ({ request }) => {
    const p1 = users.get('patient1')!;
    const res = await patientApi(request, p1.token).get(ENDPOINTS.phr);
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);
    logTestSuccess('PHR API OK');
  });

  test('C07 — Doctor patients API returns 200', async ({ request }) => {
    const doc = users.get('doctor')!;
    const res = await doctorApi(request, doc.token).get(ENDPOINTS.patients);
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);
    logTestSuccess('Doctor patients API OK');
  });

  test('C08 — Doctor lab orders API returns 200', async ({ request }) => {
    const doc = users.get('doctor')!;
    const res = await doctorApi(request, doc.token).get(ENDPOINTS.labOrders);
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);
    logTestSuccess('Doctor lab orders API OK');
  });
});
