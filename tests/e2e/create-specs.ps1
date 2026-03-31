$base = "c:\Users\chira\Documents\Isara-telemed\Isara-Anywhere\tests\e2e\specs"
$s22 = @"
import { test, expect } from '@playwright/test';
import { PATIENT_URL, DOCTOR_URL, ENDPOINTS, authenticateAllUsers, apiRequest, logTestSuccess, logTestInfo, type UserRole, type AuthenticatedUser } from '../lib/test-helpers';
let users: Map<UserRole, AuthenticatedUser>;
test.describe('22 - Notification Triggers', () => {
  test.beforeAll(async ({ request }) => { users = await authenticateAllUsers(request); });
  test.describe('A - Patient Notifications', () => {
    test('A01 - Patient1 list', async ({ request }) => { const pt = users.get('patient1')!; const res = await apiRequest(request, 'GET', PATIENT_URL, ENDPOINTS.notifications.list, pt.token); expect([200, 304]).toContain(res.status); logTestSuccess('Pt1 -> ' + res.status); });
    test('A02 - Patient1 mark read', async ({ request }) => { const pt = users.get('patient1')!; const res = await apiRequest(request, 'PUT', PATIENT_URL, ENDPOINTS.notifications.markAllRead, pt.token); expect([200, 204, 404]).toContain(res.status); logTestSuccess('Mark -> ' + res.status); });
    test('A03 - Patient2 list', async ({ request }) => { const pt = users.get('patient2')!; const res = await apiRequest(request, 'GET', PATIENT_URL, ENDPOINTS.notifications.list, pt.token); expect([200, 304]).toContain(res.status); logTestSuccess('Pt2 -> ' + res.status); });
    test('A04 - Patient3 list', async ({ request }) => { const pt = users.get('patient3')!; const res = await apiRequest(request, 'GET', PATIENT_URL, ENDPOINTS.notifications.list, pt.token); expect([200, 304]).toContain(res.status); logTestSuccess('Pt3 -> ' + res.status); });
  });
});
"@
[System.IO.File]::WriteAllText("$base\22-notification-triggers.spec.ts", $s22)
Write-Host "22 exists: $([System.IO.File]::Exists(""$base\22-notification-triggers.spec.ts""))"
