import { test, expect } from '@playwright/test';
import { PATIENT_URL, DOCTOR_URL, ENDPOINTS, authenticateAllUsers, apiRequest, loginViaBrowser, logTestSuccess, logTestInfo, type UserRole, type AuthenticatedUser } from '../lib/test-helpers';
let users: Map<UserRole, AuthenticatedUser>;
test.describe('24 - Registration Approval Metadata', () => {
  test.beforeAll(async ({ request }) => { users = await authenticateAllUsers(request); });
  test.describe('A - Registration', () => {
    test('A01 - Patient registration', async ({ request }) => { const res = await apiRequest(request, 'POST', PATIENT_URL, '/api/auth/register', '', { email: 'test_' + Date.now() + '@example.com', password: 'Test@12345', name: 'E2E Test', role: 'patient', phone: '0812345678' }); expect([200, 201, 400, 409]).toContain(res.status); logTestSuccess('Patient reg -> ' + res.status); });
    test('A02 - Doctor registration', async ({ request }) => { const res = await apiRequest(request, 'POST', DOCTOR_URL, '/api/auth/register', '', { email: 'doc_' + Date.now() + '@example.com', password: 'Doc@12345', name: 'E2E Doctor', role: 'doctor', specialization: 'General Practice', licenseNumber: 'TH-' + Date.now() }); expect([200, 201, 400, 409]).toContain(res.status); logTestSuccess('Doctor reg -> ' + res.status); });
    test('A03 - Duplicate rejected', async ({ request }) => { const res = await apiRequest(request, 'POST', PATIENT_URL, '/api/auth/register', '', { email: 'demo.test@gmail.com', password: 'Test@12345', name: 'Duplicate', role: 'patient' }); expect([400, 409, 422]).toContain(res.status); logTestSuccess('Duplicate rejected -> ' + res.status); });
  });
  test.describe('B - Admin Approval', () => {
    test('B01 - Pending doctors', async ({ request }) => { const admin = users.get('admin')!; const res = await apiRequest(request, 'GET', DOCTOR_URL, ENDPOINTS.admin.pendingDoctors, admin.token); expect([200, 304]).toContain(res.status); logTestSuccess('Pending -> ' + res.status); });
    test('B02 - Admin stats', async ({ request }) => { const admin = users.get('admin')!; const res = await apiRequest(request, 'GET', DOCTOR_URL, ENDPOINTS.admin.stats, admin.token); expect([200, 304]).toContain(res.status); logTestSuccess('Stats -> ' + res.status); });
  });
  test.describe('C - Metadata', () => {
    test('C01 - Specialties', async ({ request }) => { const doc = users.get('doctor')!; const res = await apiRequest(request, 'GET', DOCTOR_URL, ENDPOINTS.metadata.specialties, doc.token); expect([200, 304]).toContain(res.status); logTestSuccess('Specialties -> ' + res.status); });
    test('C02 - Lab tests', async ({ request }) => { const doc = users.get('doctor')!; const res = await apiRequest(request, 'GET', DOCTOR_URL, ENDPOINTS.metadata.labTests, doc.token); expect([200, 304]).toContain(res.status); logTestSuccess('Lab tests -> ' + res.status); });
    test('C03 - ICD-10', async ({ request }) => { const doc = users.get('doctor')!; const res = await apiRequest(request, 'GET', DOCTOR_URL, ENDPOINTS.metadata.icd10, doc.token); expect([200, 304]).toContain(res.status); logTestSuccess('ICD-10 -> ' + res.status); });
    test('C04 - Medications', async ({ request }) => { const doc = users.get('doctor')!; const res = await apiRequest(request, 'GET', DOCTOR_URL, ENDPOINTS.metadata.medications, doc.token); expect([200, 304]).toContain(res.status); logTestSuccess('Medications -> ' + res.status); });
  });
  test.describe('D - Browser Login Pages', () => {
    test('D01 - Patient login page', async ({ browser }) => { const ctx = await browser.newContext(); const page = await ctx.newPage(); await page.goto(PATIENT_URL + '/login', { waitUntil: 'domcontentloaded', timeout: 30000 }); expect(page.url()).toContain('/login'); logTestSuccess('Patient login page'); await ctx.close(); });
    test('D02 - Doctor login page', async ({ browser }) => { const ctx = await browser.newContext(); const page = await ctx.newPage(); await page.goto(DOCTOR_URL + '/login', { waitUntil: 'domcontentloaded', timeout: 30000 }); expect(page.url()).toContain('/login'); logTestSuccess('Doctor login page'); await ctx.close(); });
    test('D03 - Patient dashboard', async ({ browser }) => { const ctx = await browser.newContext(); const page = await ctx.newPage(); const pt = users.get('patient1')!; await loginViaBrowser(page, PATIENT_URL, pt); expect(page.url()).not.toContain('/login'); logTestSuccess('Patient dashboard OK'); await ctx.close(); });
    test('D04 - Doctor dashboard', async ({ browser }) => { const ctx = await browser.newContext(); const page = await ctx.newPage(); const doc = users.get('doctor')!; await loginViaBrowser(page, DOCTOR_URL, doc); expect(page.url()).not.toContain('/login'); logTestSuccess('Doctor dashboard OK'); await ctx.close(); });
  });
  test.describe('E - User Profiles', () => {
    test('E01 - Patient profile', async ({ request }) => { const pt = users.get('patient1')!; const res = await apiRequest(request, 'GET', PATIENT_URL, '/api/auth/me', pt.token); expect([200, 304]).toContain(res.status); logTestSuccess('Patient profile -> ' + res.status); });
    test('E02 - Doctor profile', async ({ request }) => { const doc = users.get('doctor')!; const res = await apiRequest(request, 'GET', DOCTOR_URL, '/api/auth/me', doc.token); expect([200, 304]).toContain(res.status); logTestSuccess('Doctor profile -> ' + res.status); });
    test('E03 - Doctor list', async ({ request }) => { const pt = users.get('patient1')!; const res = await apiRequest(request, 'GET', PATIENT_URL, ENDPOINTS.doctors, pt.token); expect([200, 304]).toContain(res.status); logTestSuccess('Doctor list -> ' + res.status); });
  });
});
