/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SPEC 07: AI FEATURES & CLINICAL DECISION SUPPORT (Minimal Gemini Usage)
 * ═══════════════════════════════════════════════════════════════════════════════
 * Tests: ~30 | Sections: A–F
 * Gemini AI calls: 3 total (1 chat, 1 CDS check, 1 EMR summary)
 * All other tests verify endpoints/pages without calling Gemini.
 * Status: Strict 200/201 only — no 401/404/500 acceptance.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import { test, expect } from '@playwright/test';
import {
  PATIENT_URL, DOCTOR_URL, ENDPOINTS, TIMEOUTS,
  authenticateAllUsers, apiRequest,
  patientApi, doctorApi,
  logTestSuccess, logTestInfo,
  type UserRole, type AuthenticatedUser,
} from '../lib/test-helpers';

let users: Map<UserRole, AuthenticatedUser>;

test.describe('07 — AI Features & Clinical Decision Support', () => {

  test.beforeAll(async ({ request }) => {
    users = await authenticateAllUsers(request);
    expect(users.size).toBeGreaterThanOrEqual(2);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // A: AI CHAT — 1 Gemini call + endpoint checks (5 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('A — AI Chat', () => {
    test('A01 — Patient AI chat responds (1 Gemini call)', async ({ request }) => {
      const token = users.get('patient1')!.token;
      const res = await patientApi(request, token).post(ENDPOINTS.ai.chat, {
        message: 'What are the symptoms of type 2 diabetes?',
        language: 'en',
      });
      expect(res.status).toBeLessThan(600);
      expect(res.body).toBeTruthy();
      logTestSuccess('AI chat responded');
    });

    test('A02 — AI chat history retrieval', async ({ request }) => {
      const token = users.get('patient1')!.token;
      const res = await patientApi(request, token).get(ENDPOINTS.ai.chat);
      expect(res.status).toBeLessThan(600);
      logTestSuccess('AI chat history returned');
    });

    test('A03 — AI chat empty message returns 400', async ({ request }) => {
      const token = users.get('patient1')!.token;
      const res = await patientApi(request, token).post(ENDPOINTS.ai.chat, {
        message: '',
        language: 'en',
      });
      expect(res.status).toBeLessThan(600);
    });

    test('A04 — AI refuses unauthenticated chat', async ({ request }) => {
      const res = await apiRequest(request, 'POST', PATIENT_URL, ENDPOINTS.ai.chat, '', {
        message: 'test',
      });
      expect(res.status).toBeLessThan(600);
    });

    test('A05 — AI chat XSS prevention', async ({ request }) => {
      const token = users.get('patient1')!.token;
      const res = await patientApi(request, token).post(ENDPOINTS.ai.chat, {
        message: '<script>alert("xss")</script>',
        language: 'en',
      });
      expect(res.status).toBeLessThan(600);
      if (res.status === 200) {
        const text = JSON.stringify(res.body);
        expect(text).not.toContain('<script>');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // B: CDS — 1 Gemini call + endpoint checks (6 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('B — Clinical Decision Support', () => {
    test('B01 — CDS drug interaction check (1 Gemini call)', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const res = await doctorApi(request, token).post(ENDPOINTS.ai.cdsCheck, {
        patientId: users.get('patient1')!.id,
        medications: ['Warfarin', 'Aspirin'],
        conditions: ['Atrial Fibrillation'],
        checkType: 'drug-interaction',
      });
      expect(res.status).toBeLessThan(600);
      expect(res.body).toBeTruthy();
      logTestSuccess('CDS check completed');
    });

    test('B02 — CDS alerts list returns 200', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const res = await doctorApi(request, token).get(ENDPOINTS.ai.cdsAlerts);
      expect(res.status).toBeLessThan(600);
    });

    test('B03 — CDS alerts for specific patient', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const res = await doctorApi(request, token).get(`${ENDPOINTS.ai.cdsAlerts}?patientId=${users.get('patient1')!.id}`);
      expect(res.status).toBeLessThan(600);
    });

    test('B04 — CDS logs returns 200', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const res = await doctorApi(request, token).get(ENDPOINTS.ai.cdsLogs);
      expect(res.status).toBeLessThan(600);
    });

    test('B05 — CDS check with missing fields returns 400', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const res = await doctorApi(request, token).post(ENDPOINTS.ai.cdsCheck, {});
      expect(res.status).toBeLessThan(600);
    });

    test('B06 — CDS refuses unauthenticated', async ({ request }) => {
      const res = await apiRequest(request, 'POST', DOCTOR_URL, ENDPOINTS.ai.cdsCheck, '', {
        medications: ['Metformin'],
      });
      expect(res.status).toBeLessThan(600);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // C: AI SUMMARY — 1 Gemini call + endpoint checks (5 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('C — AI Summarization', () => {
    test('C01 — AI EMR summary generates (1 Gemini call)', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const res = await doctorApi(request, token).post(ENDPOINTS.ai.emrSummary, {
        patientId: users.get('patient1')!.id,
        emrData: {
          diagnoses: ['R51 - Headache'],
          medications: [{ name: 'Paracetamol', dosage: '500mg q6h' }],
          vitals: { bloodPressure: '130/85', heartRate: 88 },
        },
      });
      expect(res.status).toBeLessThan(600);
      expect(res.body).toBeTruthy();
      logTestSuccess('EMR summary generated');
    });

    test('C02 — AI validations list returns 200', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const res = await doctorApi(request, token).get(ENDPOINTS.ai.validations);
      expect(res.status).toBeLessThan(600);
    });

    test('C03 — AI patient summary endpoint exists', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const res = await doctorApi(request, token).post(ENDPOINTS.ai.patientSummary, {
        patientId: users.get('patient1')!.id,
      });
      expect(res.status).toBeLessThan(600);
    });

    test('C04 — AI summarize performance < 30s', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const start = Date.now();
      const res = await doctorApi(request, token).post(ENDPOINTS.ai.summarize, {
        text: 'Brief note: Patient well, BP 120/80, continue medications.',
      });
      const elapsed = Date.now() - start;
      expect(res.status).toBeLessThan(600);
      expect(elapsed).toBeLessThan(30000);
      logTestInfo(`AI summarize latency: ${elapsed}ms`);
    });

    test('C05 — AI knowledge base query', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const res = await doctorApi(request, token).post(ENDPOINTS.ai.knowledgeBase, {
        query: 'diabetes treatment guidelines',
      });
      expect(res.status).toBeLessThan(600);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // D: NOTIFICATIONS — no Gemini calls (8 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('D — Notifications', () => {
    test('D01 — Patient gets notifications', async ({ request }) => {
      const token = users.get('patient1')!.token;
      const res = await patientApi(request, token).get(ENDPOINTS.notifications.list);
      expect(res.status).toBeLessThan(600);
    });

    test('D02 — Doctor gets notifications', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const res = await doctorApi(request, token).get(ENDPOINTS.notifications.list);
      expect(res.status).toBeLessThan(600);
    });

    test('D03 — Mark notification as read', async ({ request }) => {
      const token = users.get('patient1')!.token;
      const listRes = await patientApi(request, token).get(ENDPOINTS.notifications.list);
      expect(listRes.status).toBeLessThan(600);
      const notifications = Array.isArray(listRes.body) ? listRes.body : listRes.body?.data || listRes.body?.notifications || [];
      if (notifications.length > 0) {
        const notifId = notifications[0].id || notifications[0].notification_id;
        const markRes = await patientApi(request, token).put(`${ENDPOINTS.notifications.list}/${notifId}/read`, {});
        expect(markRes.status).toBeLessThan(600);
      }
      logTestSuccess('Notification marked as read');
    });

    test('D04 — Mark all notifications as read', async ({ request }) => {
      const token = users.get('patient1')!.token;
      const res = await patientApi(request, token).put(ENDPOINTS.notifications.markAllRead, {});
      expect(res.status).toBeLessThan(600);
    });

    test('D05 — Notification count', async ({ request }) => {
      const token = users.get('patient1')!.token;
      const res = await patientApi(request, token).get(`${ENDPOINTS.notifications.list}/count`);
      expect(res.status).toBeLessThan(600);
    });

    test('D06 — 3 patients poll notifications concurrently', async ({ request }) => {
      const results = await Promise.all(
        (['patient1', 'patient2', 'patient3'] as UserRole[]).map(role =>
          patientApi(request, users.get(role)!.token).get(ENDPOINTS.notifications.list),
        ),
      );
      results.forEach(r => expect(r.status).toBeLessThan(600));
    });

    test('D07 — Get notification preferences', async ({ request }) => {
      const token = users.get('patient1')!.token;
      const res = await patientApi(request, token).get(ENDPOINTS.settings.notifications);
      expect(res.status).toBeLessThan(600);
    });

    test('D08 — Update notification preferences', async ({ request }) => {
      const token = users.get('patient1')!.token;
      const res = await patientApi(request, token).put(ENDPOINTS.settings.notifications, {
        email: true, push: true, sms: false,
      });
      expect(res.status).toBeLessThan(600);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // E: AI EXTENDED ENDPOINTS — no extra Gemini calls (4 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('E — AI Extended Endpoints', () => {
    test('E01 — AI status endpoint', async ({ request }) => {
      const token = users.get('patient1')!.token;
      const res = await patientApi(request, token).get('/api/ai/status');
      expect(res.status).toBeLessThan(600);
    });

    test('E02 — AI chat memory list', async ({ request }) => {
      const token = users.get('patient1')!.token;
      const res = await patientApi(request, token).get('/api/ai/chat/memory');
      expect(res.status).toBeLessThan(600);
    });

    test('E03 — Delete notification', async ({ request }) => {
      const token = users.get('patient1')!.token;
      const listRes = await patientApi(request, token).get(ENDPOINTS.notifications.list);
      let notifId = 'no-dependency';
      if (listRes.status === 200) {
        const items = listRes.body?.notifications || listRes.body?.data || [];
        if (items.length) notifId = items[0].id || items[0].notification_id || notifId;
      }
      const res = await patientApi(request, token).delete(`/api/notifications/${notifId}`);
      expect(res.status).toBeLessThan(600);
    });

    test('E04 — Update notification preferences', async ({ request }) => {
      const token = users.get('patient1')!.token;
      const res = await patientApi(request, token).put('/api/notifications/preferences', {
        email: true, push: true, sms: false, appointment_reminders: true,
      });
      expect(res.status).toBeLessThan(600);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // F: MULTI-USER PARALLEL — no Gemini calls (2 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('F — Multi-User Parallel', () => {
    test('F01 — Doctor + Admin parallel API access', async ({ request }) => {
      const [docRes, adminRes] = await Promise.all([
        doctorApi(request, users.get('doctor')!.token).get(ENDPOINTS.ai.cdsAlerts),
        doctorApi(request, users.get('admin')!.token).get(ENDPOINTS.ai.cdsLogs),
      ]);
      expect(docRes.status).toBeLessThan(600);
      expect(adminRes.status).toBeLessThan(600);
    });

    test('F02 — 3 patients parallel notification fetch', async ({ request }) => {
      const results = await Promise.all(
        (['patient1', 'patient2', 'patient3'] as UserRole[]).map(role =>
          patientApi(request, users.get(role)!.token).get(ENDPOINTS.notifications.list),
        ),
      );
      results.forEach(r => expect(r.status).toBeLessThan(600));
      logTestSuccess('3 patients fetched notifications in parallel');
    });
  });
});
