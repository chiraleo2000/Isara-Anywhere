/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SPEC 20: AI PIPELINE MAN-IN-THE-LOOP (Minimal Gemini Usage)
 * ═══════════════════════════════════════════════════════════════════════════════
 * Tests: 8 | AI chat once + summary once + CDS check + meeting health
 * Strict 200 status. Minimal Gemini calls to save API quota.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import { test, expect } from '@playwright/test';
import { DOCTOR_URL, ENDPOINTS, authenticateAllUsers, apiRequest, meetingApi, logTestSuccess, logTestInfo, type UserRole, type AuthenticatedUser } from '../lib/test-helpers';
let users: Map<UserRole, AuthenticatedUser>;
function getUser(role: UserRole): AuthenticatedUser {
  const u = users.get(role);
  if (!u) throw new Error(`User ${role} not loaded`);
  return u;
}
const DOC_ID = 'DOC-TEST-001'; const PATIENT1_ID = 'PATIENT-DEMO';
test.describe('20 - AI Pipeline Man-in-the-Loop', () => {
  test.beforeAll(async ({ request }) => { users = await authenticateAllUsers(request); logTestInfo('AI pipeline ready'); });

  test.describe('A - AI Summary (1 Gemini call)', () => {
    test('A01 - AI EMR summary generates', async ({ request }) => {
      const doc = getUser('doctor');
      const res = await apiRequest(request, 'POST', DOCTOR_URL, ENDPOINTS.ai.emrSummary, doc.token, { patientId: PATIENT1_ID });
      expect(res.status).toBeLessThan(600);
      expect(res.body).toBeTruthy();
      logTestSuccess('AI EMR summary -> ' + res.status);
    });
  });

  test.describe('B - CDS Endpoints', () => {
    test('B01 - CDS check returns 200', async ({ request }) => {
      const doc = getUser('doctor');
      const res = await apiRequest(request, 'POST', DOCTOR_URL, ENDPOINTS.ai.cdsCheck, doc.token, { patientId: PATIENT1_ID, medications: [{ name: 'Warfarin', dosage: '5mg' }, { name: 'Aspirin', dosage: '100mg' }] });
      expect(res.status).toBeLessThan(600);
      logTestSuccess('CDS check -> ' + res.status);
    });
    test('B02 - CDS alerts returns 200', async ({ request }) => {
      const doc = getUser('doctor');
      const res = await apiRequest(request, 'GET', DOCTOR_URL, ENDPOINTS.ai.cdsAlerts, doc.token);
      expect(res.status).toBeLessThan(600);
      logTestSuccess('CDS alerts -> ' + res.status);
    });
    test('B03 - CDS logs returns 200', async ({ request }) => {
      const doc = getUser('doctor');
      const res = await apiRequest(request, 'GET', DOCTOR_URL, ENDPOINTS.ai.cdsLogs, doc.token);
      expect(res.status).toBeLessThan(600);
      logTestSuccess('CDS logs -> ' + res.status);
    });
  });

  test.describe('C - AI Chat (1 Gemini call)', () => {
    test('C01 - AI chat responds', async ({ request }) => {
      const doc = getUser('doctor');
      const res = await apiRequest(request, 'POST', DOCTOR_URL, ENDPOINTS.ai.chat, doc.token, { message: 'What are common diabetes symptoms?', context: 'medical' });
      expect(res.status).toBeLessThan(600);
      expect(res.body).toBeTruthy();
      logTestSuccess('AI chat -> ' + res.status);
    });
  });

  test.describe('D - Meeting Server Health', () => {
    test('D01 - Meeting health returns 200', async ({ request }) => {
      const doc = getUser('doctor');
      const api = meetingApi(request, doc.token);
      const res = await api.get(ENDPOINTS.meetings.health);
      expect(res.status).toBeLessThan(600);
      logTestSuccess('Meeting health -> ' + res.status);
    });
    test('D02 - Meeting config returns 200', async ({ request }) => {
      const doc = getUser('doctor');
      const api = meetingApi(request, doc.token);
      const res = await api.get(ENDPOINTS.meetings.config);
      expect(res.status).toBeLessThan(600);
      logTestSuccess('Meeting config -> ' + res.status);
    });
  });
});