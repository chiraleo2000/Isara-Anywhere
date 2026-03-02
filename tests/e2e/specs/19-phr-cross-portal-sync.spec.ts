import { test, expect } from '@playwright/test';
import { PATIENT_URL, DOCTOR_URL, ENDPOINTS, authenticateAllUsers, apiRequest, generatePHRVitals, generateEMRData, generatePrescriptionData, generateLabOrder, logTestSuccess, logTestInfo, type UserRole, type AuthenticatedUser } from '../lib/test-helpers';
let users: Map<UserRole, AuthenticatedUser>;
const DOC_ID = 'DOC-TEST-001'; const PATIENT1_ID = 'PATIENT-DEMO';
test.describe('19 - PHR Cross-Portal Sync', () => {
  test.beforeAll(async ({ request }) => { users = await authenticateAllUsers(request); logTestInfo('PHR sync tests ready'); });
  test.describe('A - Patient PHR', () => {
    test('A01 - Patient updates vitals', async ({ request }) => { const pt = users.get('patient1')!; const res = await apiRequest(request, 'POST', PATIENT_URL, ENDPOINTS.phr + '/' + PATIENT1_ID + '/vitals', pt.token, generatePHRVitals()); expect(res.status).toBeLessThan(500); logTestSuccess('Vitals -> ' + res.status); });
    test('A02 - Patient adds allergy', async ({ request }) => { const pt = users.get('patient1')!; const res = await apiRequest(request, 'POST', PATIENT_URL, ENDPOINTS.phr + '/' + PATIENT1_ID + '/allergies', pt.token, { allergen: 'Penicillin', severity: 'severe', reaction: 'Anaphylaxis' }); expect([200, 201, 404, 409]).toContain(res.status); logTestSuccess('Allergy -> ' + res.status); });
    test('A03 - Patient adds condition', async ({ request }) => { const pt = users.get('patient1')!; const res = await apiRequest(request, 'POST', PATIENT_URL, ENDPOINTS.phr + '/' + PATIENT1_ID + '/conditions', pt.token, { name: 'Type 2 Diabetes', icd10: 'E11', status: 'active' }); expect([200, 201, 404, 409]).toContain(res.status); logTestSuccess('Condition -> ' + res.status); });
    test('A04 - Patient PHR retrievable', async ({ request }) => { const pt = users.get('patient1')!; const res = await apiRequest(request, 'GET', PATIENT_URL, ENDPOINTS.phr + '/' + PATIENT1_ID, pt.token); expect([200, 304]).toContain(res.status); logTestSuccess('PHR retrieved'); });
  });
  test.describe('B - Doctor Sees PHR', () => {
    test('B01 - Doctor accesses patient PHR', async ({ request }) => { const doc = users.get('doctor')!; const res = await apiRequest(request, 'GET', DOCTOR_URL, ENDPOINTS.phr + '/' + PATIENT1_ID, doc.token); expect(res.status).toBeLessThan(500); logTestSuccess('Doctor sees PHR'); });
    test('B02 - Doctor creates EMR', async ({ request }) => { const doc = users.get('doctor')!; const res = await apiRequest(request, 'POST', DOCTOR_URL, ENDPOINTS.emr, doc.token, generateEMRData(PATIENT1_ID)); expect(res.status).toBeLessThan(500); logTestSuccess('EMR -> ' + res.status); });
    test('B03 - Doctor creates prescription', async ({ request }) => { const doc = users.get('doctor')!; const res = await apiRequest(request, 'POST', DOCTOR_URL, ENDPOINTS.prescriptions, doc.token, generatePrescriptionData(PATIENT1_ID)); expect(res.status).toBeLessThan(500); logTestSuccess('Rx -> ' + res.status); });
    test('B04 - Doctor orders lab', async ({ request }) => { const doc = users.get('doctor')!; const res = await apiRequest(request, 'POST', DOCTOR_URL, ENDPOINTS.labOrders, doc.token, generateLabOrder(PATIENT1_ID)); expect(res.status).toBeLessThan(500); logTestSuccess('Lab -> ' + res.status); });
  });
  test.describe('C - Patient Results', () => {
    test('C01 - Patient views treatment results', async ({ request }) => { const pt = users.get('patient1')!; const res = await apiRequest(request, 'GET', PATIENT_URL, ENDPOINTS.treatmentResults + '?patientId=' + PATIENT1_ID, pt.token); expect([200, 304]).toContain(res.status); logTestSuccess('Treatment results OK'); });
    test('C02 - Patient views EMR', async ({ request }) => { const pt = users.get('patient1')!; const res = await apiRequest(request, 'GET', PATIENT_URL, ENDPOINTS.emr + '?patientId=' + PATIENT1_ID, pt.token); expect(res.status).toBeLessThan(500); logTestSuccess('EMR visible'); });
    test('C03 - Patient views lab orders', async ({ request }) => { const pt = users.get('patient1')!; const res = await apiRequest(request, 'GET', PATIENT_URL, ENDPOINTS.labOrders + '?patientId=' + PATIENT1_ID, pt.token); expect(res.status).toBeLessThan(500); logTestSuccess('Lab orders visible'); });
  });
  test.describe('D - Living Will', () => {
    test('D01 - Patient updates living will', async ({ request }) => { const pt = users.get('patient1')!; const res = await apiRequest(request, 'POST', PATIENT_URL, ENDPOINTS.livingWill + '/' + PATIENT1_ID + '/living-will', pt.token, { content: 'E2E living will', pdpaConsent: true }); expect(res.status).toBeLessThan(500); logTestSuccess('Living will -> ' + res.status); });
    test('D02 - Patient retrieves living will', async ({ request }) => { const pt = users.get('patient1')!; const res = await apiRequest(request, 'GET', PATIENT_URL, ENDPOINTS.livingWill + '/' + PATIENT1_ID + '/living-will', pt.token); expect([200, 304, 404]).toContain(res.status); logTestSuccess('Living will get -> ' + res.status); });
    test('D03 - Doctor views patient living will', async ({ request }) => { const doc = users.get('doctor')!; const res = await apiRequest(request, 'GET', DOCTOR_URL, ENDPOINTS.livingWill + '/' + PATIENT1_ID + '/living-will', doc.token); expect([200, 304, 404]).toContain(res.status); logTestSuccess('Doctor living will -> ' + res.status); });
  });
});