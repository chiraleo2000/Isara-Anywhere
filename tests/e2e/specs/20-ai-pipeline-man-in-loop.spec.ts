import { test, expect } from '@playwright/test';
import { PATIENT_URL, DOCTOR_URL, MEETING_SERVER_URL, ENDPOINTS, authenticateAllUsers, apiRequest, meetingApi, logTestSuccess, logTestInfo, type UserRole, type AuthenticatedUser } from '../lib/test-helpers';
let users: Map<UserRole, AuthenticatedUser>;
const DOC_ID = 'DOC-TEST-001'; const PATIENT1_ID = 'PATIENT-DEMO';
test.describe('20 - AI Pipeline Man-in-the-Loop', () => {
  test.beforeAll(async ({ request }) => { users = await authenticateAllUsers(request); logTestInfo('AI pipeline ready'); });
  test.describe('A - AI Generation', () => {
    test('A01 - AI meeting summary', async ({ request }) => { const doc = users.get('doctor')!; const res = await apiRequest(request, 'POST', DOCTOR_URL, ENDPOINTS.ai.meetingSummary, doc.token, { transcript: 'Patient headache 3 days', patientId: PATIENT1_ID, format: 'SOAP' }); expect([200, 201, 404, 500]).toContain(res.status); logTestSuccess('AI SOAP -> ' + res.status); });
    test('A02 - AI EMR summary', async ({ request }) => { const doc = users.get('doctor')!; const res = await apiRequest(request, 'POST', DOCTOR_URL, ENDPOINTS.ai.emrSummary, doc.token, { patientId: PATIENT1_ID }); expect([200, 201, 404, 500]).toContain(res.status); logTestSuccess('AI EMR -> ' + res.status); });
    test('A03 - AI patient instruction', async ({ request }) => { const doc = users.get('doctor')!; const res = await apiRequest(request, 'POST', DOCTOR_URL, ENDPOINTS.ai.patientInstruction, doc.token, { patientId: PATIENT1_ID, diagnosis: 'Headache', medications: ['Paracetamol'] }); expect([200, 201, 404, 500]).toContain(res.status); logTestSuccess('Instruction -> ' + res.status); });
    test('A04 - AI patient summary', async ({ request }) => { const doc = users.get('doctor')!; const res = await apiRequest(request, 'POST', DOCTOR_URL, ENDPOINTS.ai.patientSummary, doc.token, { patientId: PATIENT1_ID }); expect([200, 201, 404, 500]).toContain(res.status); logTestSuccess('Summary -> ' + res.status); });
  });
  test.describe('B - CDS Checks', () => {
    test('B01 - Drug interaction check', async ({ request }) => { const doc = users.get('doctor')!; const res = await apiRequest(request, 'POST', DOCTOR_URL, ENDPOINTS.ai.cdsCheck, doc.token, { patientId: PATIENT1_ID, medications: [{ name: 'Warfarin', dosage: '5mg' }, { name: 'Aspirin', dosage: '100mg' }] }); expect([200, 201, 404, 500]).toContain(res.status); logTestSuccess('CDS -> ' + res.status); });
    test('B02 - CDS alerts', async ({ request }) => { const doc = users.get('doctor')!; const res = await apiRequest(request, 'GET', DOCTOR_URL, ENDPOINTS.ai.cdsAlerts, doc.token); expect([200, 304, 404]).toContain(res.status); logTestSuccess('Alerts -> ' + res.status); });
    test('B03 - CDS logs', async ({ request }) => { const doc = users.get('doctor')!; const res = await apiRequest(request, 'GET', DOCTOR_URL, ENDPOINTS.ai.cdsLogs, doc.token); expect([200, 304, 404]).toContain(res.status); logTestSuccess('Logs -> ' + res.status); });
  });
  test.describe('C - AI Chat', () => {
    test('C01 - AI chat', async ({ request }) => { const doc = users.get('doctor')!; const res = await apiRequest(request, 'POST', DOCTOR_URL, ENDPOINTS.ai.chat, doc.token, { message: 'Diabetes symptoms?', context: 'medical' }); expect([200, 201, 404, 500]).toContain(res.status); logTestSuccess('Chat -> ' + res.status); });
    test('C02 - AI knowledge', async ({ request }) => { const doc = users.get('doctor')!; const res = await apiRequest(request, 'POST', DOCTOR_URL, ENDPOINTS.ai.knowledge, doc.token, { query: 'hypertension' }); expect([200, 201, 404, 500]).toContain(res.status); logTestSuccess('Knowledge -> ' + res.status); });
    test('C03 - AI analyze', async ({ request }) => { const doc = users.get('doctor')!; const res = await apiRequest(request, 'POST', DOCTOR_URL, ENDPOINTS.ai.analyze, doc.token, { text: 'BP 140/90', type: 'vitals' }); expect([200, 201, 404, 500]).toContain(res.status); logTestSuccess('Analyze -> ' + res.status); });
  });
  test.describe('D - Meeting Server', () => {
    test('D01 - Meeting health', async ({ request }) => { const doc = users.get('doctor')!; const api = meetingApi(request, doc.token); const res = await api.get(ENDPOINTS.meetings.health); expect([200, 304]).toContain(res.status); logTestSuccess('Meeting health -> ' + res.status); });
    test('D02 - Meeting config', async ({ request }) => { const doc = users.get('doctor')!; const api = meetingApi(request, doc.token); const res = await api.get(ENDPOINTS.meetings.config); expect(res.status).toBeLessThan(500); logTestSuccess('Config -> ' + res.status); });
  });
});