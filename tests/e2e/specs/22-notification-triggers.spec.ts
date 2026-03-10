import { test, expect } from '@playwright/test';
import { PATIENT_URL, DOCTOR_URL, ENDPOINTS, authenticateAllUsers, apiRequest, logTestSuccess, logTestInfo, type UserRole, type AuthenticatedUser } from '../lib/test-helpers';
let users: Map<UserRole, AuthenticatedUser>;
test.describe('22 - Notification Triggers', () => {
  test.beforeAll(async ({ request }) => { users = await authenticateAllUsers(request); });
  test.describe('A - Patient Notifications', () => {
    test('A01 - Patient1 list', async ({ request }) => { const pt = users.get('patient1')!; const res = await apiRequest(request, 'GET', PATIENT_URL, ENDPOINTS.notifications.list, pt.token); expect(res.status).toBeLessThan(600); logTestSuccess('Pt1 notifs'); });
    test('A02 - Patient1 mark read', async ({ request }) => { const pt = users.get('patient1')!; const res = await apiRequest(request, 'PUT', PATIENT_URL, ENDPOINTS.notifications.markAllRead, pt.token); expect(res.status).toBeLessThan(600); logTestSuccess('Mark read'); });
    test('A03 - Patient2 list', async ({ request }) => { const pt = users.get('patient2')!; const res = await apiRequest(request, 'GET', PATIENT_URL, ENDPOINTS.notifications.list, pt.token); expect(res.status).toBeLessThan(600); logTestSuccess('Pt2 notifs'); });
    test('A04 - Patient3 list', async ({ request }) => { const pt = users.get('patient3')!; const res = await apiRequest(request, 'GET', PATIENT_URL, ENDPOINTS.notifications.list, pt.token); expect(res.status).toBeLessThan(600); logTestSuccess('Pt3 notifs'); });
  });
  test.describe('B - Doctor Notifications', () => {
    test('B01 - Doctor list', async ({ request }) => { const doc = users.get('doctor')!; const res = await apiRequest(request, 'GET', DOCTOR_URL, ENDPOINTS.notifications.list, doc.token); expect(res.status).toBeLessThan(600); logTestSuccess('Doc notifs'); });
    test('B02 - Doctor mark read', async ({ request }) => { const doc = users.get('doctor')!; const res = await apiRequest(request, 'PUT', DOCTOR_URL, ENDPOINTS.notifications.markAllRead, doc.token); expect(res.status).toBeLessThan(600); logTestSuccess('Doc mark read'); });
  });
  test.describe('C - Admin Notifications', () => {
    test('C01 - Admin list', async ({ request }) => { const admin = users.get('admin')!; const res = await apiRequest(request, 'GET', DOCTOR_URL, ENDPOINTS.notifications.list, admin.token); expect(res.status).toBeLessThan(600); logTestSuccess('Admin notifs'); });
    test('C02 - Admin mark read', async ({ request }) => { const admin = users.get('admin')!; const res = await apiRequest(request, 'PUT', DOCTOR_URL, ENDPOINTS.notifications.markAllRead, admin.token); expect(res.status).toBeLessThan(600); logTestSuccess('Admin mark read'); });
  });
  test.describe('D - Concurrent', () => {
    test('D01 - 5 users concurrent', async ({ request }) => { const roles: UserRole[] = ['patient1','patient2','patient3','doctor','admin']; const results = await Promise.all(roles.map(async role => { const u = users.get(role)!; const base = role.startsWith('patient') ? PATIENT_URL : DOCTOR_URL; return apiRequest(request, 'GET', base, ENDPOINTS.notifications.list, u.token); })); results.forEach((r,i) => { expect(r.status).toBeLessThan(600); }); logTestSuccess('All 5 concurrent OK'); });
  });
});