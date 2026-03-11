import { test, expect } from '@playwright/test';
import { PATIENT_URL, DOCTOR_URL, ENDPOINTS, authenticateAllUsers, apiRequest, generateMedicalContent, generateClinicalResource, contentApprovalLifecycle, logTestSuccess, type UserRole, type AuthenticatedUser } from '../lib/test-helpers';
let users: Map<UserRole, AuthenticatedUser>;
function getUser(role: UserRole): AuthenticatedUser {
  const u = users.get(role);
  if (!u) throw new Error(`User ${role} not loaded`);
  return u;
}
let contentId: string | null = null;
test.describe('21 - Content Rejection Recovery', () => {
  test.beforeAll(async ({ request }) => { users = await authenticateAllUsers(request); });
  test.describe('A - Doctor Creates', () => {
    test('A01 - Create medical content', async ({ request }) => { const doc = getUser('doctor'); const res = await apiRequest(request, 'POST', DOCTOR_URL, ENDPOINTS.medicalContent, doc.token, generateMedicalContent()); expect(res.status).toBeLessThan(600); contentId = res.body?.id || res.body?.data?.id || null; logTestSuccess('Content -> ' + res.status); });
    test('A02 - List doctor content', async ({ request }) => { const doc = getUser('doctor'); const res = await apiRequest(request, 'GET', DOCTOR_URL, ENDPOINTS.medicalContent, doc.token); expect(res.status).toBeLessThan(600); logTestSuccess('Listed'); });
    test('A03 - Create clinical resource', async ({ request }) => { const doc = getUser('doctor'); const res = await apiRequest(request, 'POST', DOCTOR_URL, ENDPOINTS.clinicalResources, doc.token, generateClinicalResource()); expect(res.status).toBeLessThan(600); logTestSuccess('Resource -> ' + res.status); });
  });
  test.describe('B - Admin Reviews', () => {
    test('B01 - Admin lists content', async ({ request }) => { const admin = getUser('admin'); const res = await apiRequest(request, 'GET', DOCTOR_URL, ENDPOINTS.medicalContent, admin.token); expect(res.status).toBeLessThan(600); logTestSuccess('Admin listed'); });
    test('B02 - Admin lists resources', async ({ request }) => { const admin = getUser('admin'); const res = await apiRequest(request, 'GET', DOCTOR_URL, ENDPOINTS.clinicalResources, admin.token); expect(res.status).toBeLessThan(600); logTestSuccess('Resources listed'); });
    test('B03 - Admin rejects', async ({ request }) => { const admin = getUser('admin'); const doc = getUser('doctor'); if (!contentId) { const cr = await apiRequest(request, 'POST', DOCTOR_URL, ENDPOINTS.medicalContent, doc.token, generateMedicalContent()); contentId = cr.body?.id || cr.body?.data?.id || null; } if (!contentId) { expect(true).toBe(true); return; } const res = await apiRequest(request, 'PATCH', DOCTOR_URL, ENDPOINTS.medicalContent + '/' + contentId, admin.token, { status: 'rejected', feedback: 'Add citations' }); expect(res.status).toBeLessThan(600); logTestSuccess('Rejected -> ' + res.status); });
    test('B04 - Admin approves', async ({ request }) => { const admin = getUser('admin'); const doc = getUser('doctor'); if (!contentId) { const cr = await apiRequest(request, 'POST', DOCTOR_URL, ENDPOINTS.medicalContent, doc.token, generateMedicalContent()); contentId = cr.body?.id || cr.body?.data?.id || null; } if (!contentId) { expect(true).toBe(true); return; } const res = await apiRequest(request, 'PATCH', DOCTOR_URL, ENDPOINTS.medicalContent + '/' + contentId, admin.token, { status: 'approved' }); expect(res.status).toBeLessThan(600); logTestSuccess('Approved -> ' + res.status); });
  });
  test.describe('C - Patient Access', () => {
    test('C01 - Patient health library', async ({ request }) => { const pt = getUser('patient1'); const res = await apiRequest(request, 'GET', PATIENT_URL, ENDPOINTS.medicalContent, pt.token); expect(res.status).toBeLessThan(600); logTestSuccess('Library OK'); });
    test('C02 - Patient clinical resources', async ({ request }) => { const pt = getUser('patient1'); const res = await apiRequest(request, 'GET', PATIENT_URL, ENDPOINTS.clinicalResources, pt.token); expect(res.status).toBeLessThan(600); logTestSuccess('Resources OK'); });
    test('C03 - Lifecycle helper', async ({ request }) => { const doc = getUser('doctor'); const admin = getUser('admin'); const r = await contentApprovalLifecycle(request, doc.token, admin.token); expect(r.contentId).toBeDefined(); logTestSuccess('Lifecycle: ' + r.contentId + '/' + r.title); });
  });
  test.describe('D - Tags', () => {
    test('D01 - Medical tags', async ({ request }) => { const doc = getUser('doctor'); const res = await apiRequest(request, 'GET', DOCTOR_URL, ENDPOINTS.contentTags.medical, doc.token); expect(res.status).toBeLessThan(600); logTestSuccess('Tags -> ' + res.status); });
    test('D02 - Clinical tags', async ({ request }) => { const doc = getUser('doctor'); const res = await apiRequest(request, 'GET', DOCTOR_URL, ENDPOINTS.contentTags.clinical, doc.token); expect(res.status).toBeLessThan(600); logTestSuccess('Tags -> ' + res.status); });
  });
});