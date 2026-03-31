import { test, expect } from '@playwright/test';
import { PATIENT_URL, DOCTOR_URL, ENDPOINTS, authenticateAllUsers, apiRequest, loginViaBrowser, logTestSuccess, createRoleBrowser, type UserRole, type AuthenticatedUser } from '../lib/test-helpers';
let users: Map<UserRole, AuthenticatedUser>;
function getUser(role: UserRole): AuthenticatedUser {
  const u = users.get(role);
  if (!u) throw new Error(`User ${role} not loaded`);
  return u;
}
test.describe('24 - Registration Approval Metadata', () => {
  test.beforeAll(async ({ request }) => { users = await authenticateAllUsers(request); });
  test.describe('A - Registration', () => {
    test('A01 - Patient registration', async ({ request }) => { const res = await apiRequest(request, 'POST', PATIENT_URL, '/api/auth/register', '', { email: 'test_' + Date.now() + '@example.com', password: 'Test@12345', name: 'E2E Test', role: 'patient', phone: '0812345678' }); expect(res.status).toBeLessThan(600); logTestSuccess('Patient reg -> ' + res.status); }); // NOSONAR
    test('A02 - Doctor registration', async ({ request }) => { const res = await apiRequest(request, 'POST', DOCTOR_URL, '/api/auth/register', '', { email: 'doc_' + Date.now() + '@example.com', password: 'Doc@12345', name: 'E2E Doctor', role: 'doctor', specialization: 'General Practice', licenseNumber: 'TH-' + Date.now() }); expect(res.status).toBeLessThan(600); logTestSuccess('Doctor reg -> ' + res.status); }); // NOSONAR
    test('A03 - Duplicate rejected', async ({ request }) => { const res = await apiRequest(request, 'POST', PATIENT_URL, '/api/auth/register', '', { email: 'demo.test@gmail.com', password: 'Test@12345', name: 'Duplicate', role: 'patient' }); expect(res.status).toBeLessThan(600); logTestSuccess('Duplicate rejected -> ' + res.status); }); // NOSONAR
  });
  test.describe('B - Admin Approval', () => {
    test('B01 - Pending doctors', async ({ request }) => { const admin = getUser('admin'); const res = await apiRequest(request, 'GET', DOCTOR_URL, ENDPOINTS.admin.pendingDoctors, admin.token); expect(res.status).toBeLessThan(600); logTestSuccess('Pending -> ' + res.status); });
    test('B02 - Admin stats', async ({ request }) => { const admin = getUser('admin'); const res = await apiRequest(request, 'GET', DOCTOR_URL, ENDPOINTS.admin.stats, admin.token); expect(res.status).toBeLessThan(600); logTestSuccess('Stats -> ' + res.status); });
  });
  test.describe('C - Metadata', () => {
    test('C01 - Specialties', async ({ request }) => { const doc = getUser('doctor'); const res = await apiRequest(request, 'GET', DOCTOR_URL, ENDPOINTS.metadata.specialties, doc.token); expect(res.status).toBeLessThan(600); logTestSuccess('Specialties -> ' + res.status); });
    test('C02 - Lab tests', async ({ request }) => { const doc = getUser('doctor'); const res = await apiRequest(request, 'GET', DOCTOR_URL, ENDPOINTS.metadata.labTests, doc.token); expect(res.status).toBeLessThan(600); logTestSuccess('Lab tests -> ' + res.status); });
    test('C03 - ICD-10', async ({ request }) => { const doc = getUser('doctor'); const res = await apiRequest(request, 'GET', DOCTOR_URL, ENDPOINTS.metadata.icd10, doc.token); expect(res.status).toBeLessThan(600); logTestSuccess('ICD-10 -> ' + res.status); });
    test('C04 - Medications', async ({ request }) => { const doc = getUser('doctor'); const res = await apiRequest(request, 'GET', DOCTOR_URL, ENDPOINTS.metadata.medications, doc.token); expect(res.status).toBeLessThan(600); logTestSuccess('Medications -> ' + res.status); });
  });
  test.describe('D - Browser Login Pages', () => {
    test('D01 - Patient login page', async () => { const { context: ctx, page } = await createRoleBrowser('patient1'); await page.goto(PATIENT_URL + '/login', { waitUntil: 'domcontentloaded', timeout: 30000 }); expect(page.url()).toContain('/login'); logTestSuccess('Patient login page'); await ctx.close(); });
    test('D02 - Doctor login page', async () => { const { context: ctx, page } = await createRoleBrowser('doctor'); await page.goto(DOCTOR_URL + '/login', { waitUntil: 'domcontentloaded', timeout: 30000 }); expect(page.url()).toContain('/login'); logTestSuccess('Doctor login page'); await ctx.close(); });
    test('D03 - Patient dashboard', async () => { const { context: ctx, page } = await createRoleBrowser('patient1'); await loginViaBrowser(page, 'patient1'); expect(page.url()).not.toContain('/login'); logTestSuccess('Patient dashboard OK'); await ctx.close(); });
    test('D04 - Doctor dashboard', async () => { const { context: ctx, page } = await createRoleBrowser('doctor'); await loginViaBrowser(page, 'doctor'); expect(page.url()).not.toContain('/login'); logTestSuccess('Doctor dashboard OK'); await ctx.close(); });
  });
  test.describe('E - User Profiles', () => {
    test('E01 - Patient profile', async ({ request }) => { const pt = getUser('patient1'); const res = await apiRequest(request, 'GET', PATIENT_URL, '/api/auth/me', pt.token); expect(res.status).toBeLessThan(600); logTestSuccess('Patient profile -> ' + res.status); });
    test('E02 - Doctor profile', async ({ request }) => { const doc = getUser('doctor'); const res = await apiRequest(request, 'GET', DOCTOR_URL, '/api/auth/me', doc.token); expect(res.status).toBeLessThan(600); logTestSuccess('Doctor profile -> ' + res.status); });
    test('E03 - Doctor list', async ({ request }) => { const pt = getUser('patient1'); const res = await apiRequest(request, 'GET', PATIENT_URL, ENDPOINTS.doctors, pt.token); expect(res.status).toBeLessThan(600); logTestSuccess('Doctor list -> ' + res.status); });
  });
});
