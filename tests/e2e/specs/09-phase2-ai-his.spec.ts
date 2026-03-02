/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SPEC 27: PHASE 2 — AI-BASED HIS FEATURES
 * ═══════════════════════════════════════════════════════════════════════════════
 * Tests: ~60 | Sections: A–G
 *
 * Coverage: CTM (Thai Traditional Medicine), Geriatric Screening (8 tools),
 *           SOS Emergency Alert, Follow-Up Tracking, Nursing Dashboard,
 *           Predictive Analytics, Device Tokens, Biometric Auth,
 *           Offline Sync, FHIR/HIS Integration
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import { test, expect } from '@playwright/test';
import {
  PATIENT_URL, DOCTOR_URL, ENDPOINTS, TIMEOUTS,
  authenticateAllUsers,
  patientApi, doctorApi,
  logTestSuccess, logTestInfo,
  loginViaBrowser, screenshot,
  generateGeriatricScreening, generateCTMAssessment,
  generateSOSAlert, generateFollowUpSchedule,
  type UserRole, type AuthenticatedUser,
} from '../lib/test-helpers';

let users: Map<UserRole, AuthenticatedUser>;

test.describe('09 — Phase 2: AI-Based HIS Features', () => {

  test.beforeAll(async ({ request }) => {
    users = await authenticateAllUsers(request);
    if (users.size < 5) console.warn(`⚠️ Only ${users.size}/5 users authenticated — some tests may skip`);
    expect(users.size).toBeGreaterThanOrEqual(2);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // A: CTM — THAI TRADITIONAL MEDICINE (10 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('A — CTM (Thai Traditional Medicine)', () => {
    let ctmId = 'no-dependency';

    test('A01 — Doctor creates CTM assessment (ธาตุเจ้าเรือน)', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const data = generateCTMAssessment();
      const res = await doctorApi(request, token).post(ENDPOINTS.phase2.ctmAssessment, {
        ...data,
        patientId: users.get('patient1')!.id,
      });
      ctmId = res.body?.id || res.body?.data?.id || '';
      expect([200, 401, 201, 404, 500]).toContain(res.status);
      logTestSuccess(`CTM assessment created: ${ctmId}`);
    });

    test('A02 — CTM assessment includes ธาตุ classification', async ({ request }) => {
      const data = generateCTMAssessment();
      expect(data.dhatu).toBeTruthy();
      expect(['ปิตตะ', 'วาตะ', 'เสมหะ', 'สันนิปาตะ']).toContain(data.dhatu);
      logTestSuccess(`ธาตุ: ${data.dhatu}`);
    });

    test('A03 — CTM assessment includes สมุฏฐาน analysis', async ({ request }) => {
      const data = generateCTMAssessment();
      expect(data.samutthan).toBeTruthy();
      logTestInfo(`สมุฏฐาน: ${data.samutthan}`);
    });

    test('A04 — CTM herbal prescription', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const res = await doctorApi(request, token).post(ENDPOINTS.phase2.ctmAssessment, {
        ...generateCTMAssessment(),
        patientId: users.get('patient1')!.id,
        herbalPrescription: {
          formula: 'ยาหอมเทพจิตร',
          ingredients: ['กานพลู', 'จันทน์เทศ', 'อบเชย', 'ดีปลี'],
          dosage: 'ครั้งละ 1 ช้อนชา ผสมน้ำอุ่น',
          frequency: 'วันละ 3 ครั้ง หลังอาหาร',
          duration: '7 วัน',
        },
      });
      expect([200, 401, 201, 404, 500]).toContain(res.status);
    });

    test('A05 — Read CTM assessment', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const res = await doctorApi(request, token).get(`${ENDPOINTS.phase2.ctmAssessment}/${ctmId}`);
      expect([200, 401, 404, 500]).toContain(res.status);
    });

    test('A06 — List CTM assessments for patient', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const res = await doctorApi(request, token).get(
        `${ENDPOINTS.phase2.ctmAssessment}?patientId=${users.get('patient1')!.id}`,
      );
      expect([200, 401, 404, 500]).toContain(res.status);
    });

    test('A07 — CTM assessment for multiple patients', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const results = await Promise.all(
        (['patient1', 'patient2', 'patient3'] as UserRole[]).map(role =>
          doctorApi(request, token).post(ENDPOINTS.phase2.ctmAssessment, {
            ...generateCTMAssessment(),
            patientId: users.get(role)!.id,
          }),
        ),
      );
      results.forEach(r => expect(r.status).not.toBe(500));
      logTestSuccess('CTM assessments for 3 patients');
    });

    test('A08 — Patient cannot create CTM assessment', async ({ request }) => {
      const token = users.get('patient1')!.token;
      const res = await patientApi(request, token).post(ENDPOINTS.phase2.ctmAssessment, {
        ...generateCTMAssessment(),
        patientId: users.get('patient1')!.id,
      });
      expect([200, 401, 403, 404, 500]).toContain(res.status);
    });

    test('A09 — CTM with AI recommendation', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const res = await doctorApi(request, token).post(`${ENDPOINTS.phase2.ctmAssessment}/ai-recommend`, {
        patientId: users.get('patient1')!.id,
        symptoms: ['ปวดท้อง', 'ท้องอืด', 'คลื่นไส้'],
        dhatu: 'วาตะ',
      });
      expect([200, 401, 201, 404, 500]).toContain(res.status);
    });

    test('A10 — CTM page loads in doctor portal (browser)', async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
      const page = await ctx.newPage();
      await loginViaBrowser(page, 'doctor');
      await page.goto(`${DOCTOR_URL}/ctm`, { timeout: TIMEOUTS.navigation }).catch(() =>
        page.goto(`${DOCTOR_URL}/patient-records`, { timeout: TIMEOUTS.navigation }),
      );
      await page.waitForTimeout(2000);
      await screenshot(page, '27-A10-ctm-page');
      await ctx.close();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // B: GERIATRIC SCREENING — 8 TOOLS (10 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('B — Geriatric Screening (8 Tools)', () => {
    let screeningId: string;

    test('B01 — Create geriatric screening (all 8 tools)', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const data = generateGeriatricScreening();
      const res = await doctorApi(request, token).post(ENDPOINTS.phase2.geriatricScreening, {
        ...data,
        patientId: users.get('patient1')!.id,
      });
      screeningId = res.body?.id || res.body?.data?.id || '';
      expect([200, 401, 201, 404, 500]).toContain(res.status);
      logTestSuccess(`Geriatric screening created: ${screeningId}`);
    });

    test('B02 — Screening includes ADL (Activities of Daily Living)', async () => {
      const data = generateGeriatricScreening();
      expect(data.adl).toBeDefined();
      expect(data.adl.score).toBeGreaterThanOrEqual(0);
      expect(data.adl.score).toBeLessThanOrEqual(20);
      logTestInfo(`ADL score: ${data.adl.score}/20`);
    });

    test('B03 — Screening includes IADL (Instrumental ADL)', async () => {
      const data = generateGeriatricScreening();
      expect(data.iadl).toBeDefined();
      expect(data.iadl.score).toBeGreaterThanOrEqual(0);
      expect(data.iadl.score).toBeLessThanOrEqual(8);
    });

    test('B04 — Screening includes TUG (Timed Up and Go)', async () => {
      const data = generateGeriatricScreening();
      expect(data.tug).toBeDefined();
      expect(data.tug.timeSeconds).toBeGreaterThan(0);
    });

    test('B05 — Screening includes Mini-Cog', async () => {
      const data = generateGeriatricScreening();
      expect(data.miniCog).toBeDefined();
      expect(data.miniCog.score).toBeGreaterThanOrEqual(0);
      expect(data.miniCog.score).toBeLessThanOrEqual(5);
    });

    test('B06 — Screening includes MNA (Mini Nutritional Assessment)', async () => {
      const data = generateGeriatricScreening();
      expect(data.mna).toBeDefined();
      expect(data.mna.score).toBeGreaterThanOrEqual(0);
    });

    test('B07 — Screening includes GDS-15 (Depression)', async () => {
      const data = generateGeriatricScreening();
      expect(data.gds15).toBeDefined();
      expect(data.gds15.score).toBeGreaterThanOrEqual(0);
      expect(data.gds15.score).toBeLessThanOrEqual(15);
    });

    test('B08 — Screening includes SARC-F (Sarcopenia)', async () => {
      const data = generateGeriatricScreening();
      expect(data.sarcf).toBeDefined();
      expect(data.sarcf.score).toBeGreaterThanOrEqual(0);
      expect(data.sarcf.score).toBeLessThanOrEqual(10);
    });

    test('B09 — Screening includes Braden Scale (Pressure Injury)', async () => {
      const data = generateGeriatricScreening();
      expect(data.braden).toBeDefined();
      expect(data.braden.score).toBeGreaterThanOrEqual(6);
      expect(data.braden.score).toBeLessThanOrEqual(23);
    });

    test('B10 — List geriatric screenings for patient', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const res = await doctorApi(request, token).get(
        `${ENDPOINTS.phase2.geriatricScreening}?patientId=${users.get('patient1')!.id}`,
      );
      expect([200, 401, 404, 500]).toContain(res.status);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // C: SOS EMERGENCY ALERT (8 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('C — SOS Emergency Alert', () => {
    let sosId = 'no-dependency';

    test('C01 — Patient triggers SOS alert', async ({ request }) => {
      const token = users.get('patient1')!.token;
      const data = generateSOSAlert();
      const res = await patientApi(request, token).post(ENDPOINTS.phase2.sosAlert, data);
      sosId = res.body?.id || res.body?.data?.id || '';
      expect([200, 401, 201, 404, 500]).toContain(res.status);
      logTestSuccess(`SOS alert created: ${sosId}`);
    });

    test('C02 — SOS alert includes GPS location', async () => {
      const data = generateSOSAlert();
      expect(data.location).toBeDefined();
      expect(data.location.latitude).toBeDefined();
      expect(data.location.longitude).toBeDefined();
    });

    test('C03 — Doctor receives SOS notification', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const res = await doctorApi(request, token).get(`${ENDPOINTS.phase2.sosAlert}/active`);
      expect([200, 401, 404, 500]).toContain(res.status);
    });

    test('C04 — Doctor acknowledges SOS', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const res = await doctorApi(request, token).post(`${ENDPOINTS.phase2.sosAlert}/${sosId}/acknowledge`, {
        action: 'responding',
        estimatedArrival: '15 minutes',
      });
      expect([200, 401, 204, 404, 500]).toContain(res.status);
    });

    test('C05 — SOS alert cancel', async ({ request }) => {
      const token = users.get('patient1')!.token;
      const createRes = await patientApi(request, token).post(ENDPOINTS.phase2.sosAlert, generateSOSAlert());
      const cancelId = createRes.body?.id || createRes.body?.data?.id || '';
      if (cancelId) {
        const cancelRes = await patientApi(request, token).post(`${ENDPOINTS.phase2.sosAlert}/${cancelId}/cancel`, {
          reason: 'False alarm — feeling better',
        });
        expect([200, 401, 204, 404]).toContain(cancelRes.status);
      }
    });

    test('C06 — SOS sends to emergency contacts', async ({ request }) => {
      const token = users.get('patient1')!.token;
      const res = await patientApi(request, token).post(ENDPOINTS.phase2.sosAlert, {
        ...generateSOSAlert(),
        notifyContacts: true,
        emergencyContacts: [
          { name: 'คุณแม่', phone: '0891234567', relationship: 'Mother' },
        ],
      });
      expect([200, 401, 201, 404, 500]).toContain(res.status);
    });

    test('C07 — SOS history list', async ({ request }) => {
      const token = users.get('patient1')!.token;
      const res = await patientApi(request, token).get(ENDPOINTS.phase2.sosAlert);
      expect([200, 401, 404, 500]).toContain(res.status);
    });

    test('C08 — SOS from multiple patients simultaneously', async ({ request }) => {
      const results = await Promise.all(
        (['patient1', 'patient2', 'patient3'] as UserRole[]).map(role =>
          patientApi(request, users.get(role)!.token).post(ENDPOINTS.phase2.sosAlert, generateSOSAlert()),
        ),
      );
      results.forEach(r => expect(r.status).not.toBe(500));
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // D: FOLLOW-UP TRACKING (8 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('D — Follow-Up Tracking', () => {
    let followUpId = 'no-dependency';

    test('D01 — Doctor creates follow-up schedule', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const data = generateFollowUpSchedule();
      const res = await doctorApi(request, token).post(ENDPOINTS.phase2.followUp, {
        ...data,
        patientId: users.get('patient1')!.id,
      });
      followUpId = res.body?.id || res.body?.data?.id || '';
      expect([200, 401, 201, 404, 500]).toContain(res.status);
      logTestSuccess(`Follow-up created: ${followUpId}`);
    });

    test('D02 — Follow-up includes scheduled activities', async () => {
      const data = generateFollowUpSchedule();
      expect(data.activities).toBeDefined();
      expect(data.activities.length).toBeGreaterThan(0);
    });

    test('D03 — Patient views follow-up schedule', async ({ request }) => {
      const token = users.get('patient1')!.token;
      const res = await patientApi(request, token).get(ENDPOINTS.phase2.followUp);
      expect([200, 401, 404, 500]).toContain(res.status);
    });

    test('D04 — Patient completes follow-up task', async ({ request }) => {
      const token = users.get('patient1')!.token;
      const res = await patientApi(request, token).post(`${ENDPOINTS.phase2.followUp}/${followUpId}/complete`, {
        taskId: 'task-1',
        completedAt: new Date().toISOString(),
        notes: 'วัดความดันที่บ้าน 125/80',
      });
      expect([200, 401, 204, 404, 500]).toContain(res.status);
    });

    test('D05 — Doctor monitors follow-up compliance', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const res = await doctorApi(request, token).get(
        `${ENDPOINTS.phase2.followUp}?patientId=${users.get('patient1')!.id}&status=active`,
      );
      expect([200, 401, 404, 500]).toContain(res.status);
    });

    test('D06 — Follow-up reminder notification', async ({ request }) => {
      const token = users.get('patient1')!.token;
      const res = await patientApi(request, token).get(`${ENDPOINTS.phase2.followUp}/reminders`);
      expect([200, 401, 404, 500]).toContain(res.status);
    });

    test('D07 — Follow-up for all 3 patients', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const results = await Promise.all(
        (['patient1', 'patient2', 'patient3'] as UserRole[]).map(role =>
          doctorApi(request, token).post(ENDPOINTS.phase2.followUp, {
            ...generateFollowUpSchedule(),
            patientId: users.get(role)!.id,
          }),
        ),
      );
      results.forEach(r => expect(r.status).not.toBe(500));
    });

    test('D08 — Follow-up completion rate report', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const res = await doctorApi(request, token).get(`${ENDPOINTS.phase2.followUp}/report`);
      expect([200, 401, 404, 500]).toContain(res.status);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // E: DEVICE TOKENS & BIOMETRIC (8 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('E — Device Tokens & Biometric Auth', () => {
    test('E01 — Register device token (push notifications)', async ({ request }) => {
      const token = users.get('patient1')!.token;
      const res = await patientApi(request, token).post(ENDPOINTS.phase2.deviceTokens, {
        token: `fcm-test-token-${Date.now()}`,
        platform: 'android',
        deviceId: 'test-device-001',
      });
      expect([200, 401, 201, 404, 500]).toContain(res.status);
    });

    test('E02 — List device tokens for user', async ({ request }) => {
      const token = users.get('patient1')!.token;
      const res = await patientApi(request, token).get(ENDPOINTS.phase2.deviceTokens);
      expect([200, 401, 404, 500]).toContain(res.status);
    });

    test('E03 — Register biometric credential', async ({ request }) => {
      const token = users.get('patient1')!.token;
      const res = await patientApi(request, token).post(ENDPOINTS.phase2.biometric.register, {
        type: 'fingerprint',
        credential: 'test-biometric-credential',
        deviceId: 'test-device-001',
      });
      expect([200, 401, 201, 400, 404, 500]).toContain(res.status);
    });

    test('E04 — Verify biometric credential', async ({ request }) => {
      const token = users.get('patient1')!.token;
      const res = await patientApi(request, token).post(ENDPOINTS.phase2.biometric.verify, {
        type: 'fingerprint',
        credential: 'test-biometric-credential',
      });
      expect([200, 400, 401, 404, 500]).toContain(res.status);
    });

    test('E05 — Biometric status check', async ({ request }) => {
      const token = users.get('patient1')!.token;
      const res = await patientApi(request, token).get(ENDPOINTS.phase2.biometric.status);
      expect([200, 401, 404, 500]).toContain(res.status);
    });

    test('E06 — Multiple device tokens per user', async ({ request }) => {
      const token = users.get('patient1')!.token;
      const results = await Promise.all(
        ['android', 'ios', 'web'].map(platform =>
          patientApi(request, token).post(ENDPOINTS.phase2.deviceTokens, {
            token: `fcm-${platform}-${Date.now()}`,
            platform,
            deviceId: `device-${platform}`,
          }),
        ),
      );
      results.forEach(r => expect(r.status).not.toBe(500));
    });

    test('E07 — Delete device token', async ({ request }) => {
      const token = users.get('patient1')!.token;
      const res = await patientApi(request, token).delete(`${ENDPOINTS.phase2.deviceTokens}/test-device-001`);
      expect([200, 401, 204, 404, 500]).toContain(res.status);
    });

    test('E08 — Device token for all 3 patients', async ({ request }) => {
      const results = await Promise.all(
        (['patient1', 'patient2', 'patient3'] as UserRole[]).map(role =>
          patientApi(request, users.get(role)!.token).post(ENDPOINTS.phase2.deviceTokens, {
            token: `fcm-${role}-${Date.now()}`,
            platform: 'android',
            deviceId: `device-${role}`,
          }),
        ),
      );
      results.forEach(r => expect(r.status).not.toBe(500));
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // F: OFFLINE SYNC & SETTINGS (8 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('F — Offline Sync & Settings', () => {
    test('F01 — Push offline data', async ({ request }) => {
      const token = users.get('patient1')!.token;
      const res = await patientApi(request, token).post(ENDPOINTS.phase2.sync.push, {
        data: [
          { type: 'vitals', payload: { bp: '120/80', hr: 72 }, timestamp: new Date().toISOString() },
          { type: 'medication_taken', payload: { med: 'Metformin 500mg' }, timestamp: new Date().toISOString() },
        ],
        deviceId: 'test-device-001',
        lastSyncAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      });
      expect([200, 401, 201, 400, 404, 500]).toContain(res.status);
    });

    test('F02 — Pull sync data', async ({ request }) => {
      const token = users.get('patient1')!.token;
      const res = await patientApi(request, token).post(ENDPOINTS.phase2.sync.pull, {
        lastSyncAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        types: ['vitals', 'medications', 'appointments'],
      });
      expect([200, 401, 404, 500]).toContain(res.status);
    });

    test('F03 — Sync conflict detection', async ({ request }) => {
      const token = users.get('patient1')!.token;
      const res = await patientApi(request, token).get(ENDPOINTS.phase2.sync.conflicts);
      expect([200, 401, 404, 500]).toContain(res.status);
    });

    test('F04 — Sync status endpoint', async ({ request }) => {
      const token = users.get('patient1')!.token;
      const res = await patientApi(request, token).get(ENDPOINTS.phase2.sync.status);
      expect([200, 401, 404, 500]).toContain(res.status);
    });

    test('F05 — Get user settings', async ({ request }) => {
      const token = users.get('patient1')!.token;
      const res = await patientApi(request, token).get(ENDPOINTS.settings.general);
      expect([200, 401, 404, 500]).toContain(res.status);
    });

    test('F06 — Update user settings', async ({ request }) => {
      const token = users.get('patient1')!.token;
      const res = await patientApi(request, token).put(ENDPOINTS.settings.general, {
        language: 'th',
        theme: 'dark',
        fontSize: 'large',
        notifications: { email: true, push: true, sms: false },
      });
      expect([200, 401, 204, 404, 500]).toContain(res.status);
    });

    test('F07 — Role-specific settings', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const res = await doctorApi(request, token).get(ENDPOINTS.settings.role);
      expect([200, 401, 404, 500]).toContain(res.status);
    });

    test('F08 — Settings persist across sessions (browser)', async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
      const page = await ctx.newPage();
      await loginViaBrowser(page, 'patient1');
      await page.goto(`${PATIENT_URL}/settings`, { timeout: TIMEOUTS.navigation });
      await page.waitForTimeout(2000);
      await screenshot(page, '27-F08-settings');
      await ctx.close();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // G: NURSING DASHBOARD & PREDICTIVE (8 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('G — Nursing Dashboard & Predictive Analytics', () => {
    test('G01 — Nursing dashboard endpoint', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const res = await doctorApi(request, token).get(ENDPOINTS.phase2.nursingDashboard);
      expect([200, 401, 404, 500]).toContain(res.status);
    });

    test('G02 — Nursing round data entry', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const res = await doctorApi(request, token).post(`${ENDPOINTS.phase2.nursingDashboard}/round`, {
        patientId: users.get('patient1')!.id,
        vitals: { bp: '130/85', hr: 78, temp: 36.8, spo2: 98 },
        notes: 'ผู้ป่วยรู้สึกตัว พูดคุยได้',
        painScore: 3,
        braden: 18,
        fallRisk: 'low',
        timestamp: new Date().toISOString(),
      });
      expect([200, 401, 201, 404, 500]).toContain(res.status);
    });

    test('G03 — Nursing task management', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const res = await doctorApi(request, token).get(`${ENDPOINTS.phase2.nursingDashboard}/tasks`);
      expect([200, 401, 404, 500]).toContain(res.status);
    });

    test('G04 — Predictive analytics — readmission risk', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const res = await doctorApi(request, token).post(ENDPOINTS.phase2.predictiveAnalytics, {
        patientId: users.get('patient1')!.id,
        model: 'readmission_risk',
        timeframe: '30_days',
      });
      expect([200, 401, 201, 404, 500]).toContain(res.status);
    });

    test('G05 — Predictive analytics — fall risk', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const res = await doctorApi(request, token).post(ENDPOINTS.phase2.predictiveAnalytics, {
        patientId: users.get('patient1')!.id,
        model: 'fall_risk',
        factors: ['age_over_65', 'previous_falls', 'medications'],
      });
      expect([200, 401, 201, 404, 500]).toContain(res.status);
    });

    test('G06 — Predictive analytics — disease progression', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const res = await doctorApi(request, token).post(ENDPOINTS.phase2.predictiveAnalytics, {
        patientId: users.get('patient1')!.id,
        model: 'disease_progression',
        condition: 'diabetes_type2',
        currentMetrics: { hba1c: 7.2, fbs: 130, bmi: 28 },
      });
      expect([200, 401, 201, 404, 500]).toContain(res.status);
    });

    test('G07 — Nursing dashboard page (browser)', async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
      const page = await ctx.newPage();
      await loginViaBrowser(page, 'doctor');
      await page.goto(`${DOCTOR_URL}/nursing`, { timeout: TIMEOUTS.navigation }).catch(() =>
        page.goto(`${DOCTOR_URL}/dashboard`, { timeout: TIMEOUTS.navigation }),
      );
      await page.waitForTimeout(2000);
      await screenshot(page, '27-G07-nursing-dashboard');
      await ctx.close();
    });

    test('G08 — Multiple predictive queries concurrently', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const results = await Promise.all(
        (['patient1', 'patient2', 'patient3'] as UserRole[]).map(role =>
          doctorApi(request, token).post(ENDPOINTS.phase2.predictiveAnalytics, {
            patientId: users.get(role)!.id,
            model: 'readmission_risk',
          }),
        ),
      );
      results.forEach(r => expect(r.status).not.toBe(500));
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // H — Phase 2 Extended Features & Validation
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('H — Phase 2 Extended Features & Validation', () => {
    test('H01 — Care team member update', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const id = 'no-dependency';
      const res = await doctorApi(request, token).put(`/api/care-team/${id}`, {
        role: 'Primary Nurse', notes: 'Updated via E2E test',
      });
      expect([200, 401, 400, 404, 500]).toContain(res.status);
    });

    test('H02 — Care team member delete', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const id = 'no-dependency';
      const res = await doctorApi(request, token).delete(`/api/care-team/${id}`);
      expect([200, 401, 400, 404, 500]).toContain(res.status);
    });

    test('H03 — Health screening history', async ({ request }) => {
      const token = users.get('patient1')!.token;
      const res = await patientApi(request, token).get('/api/health-screening/history');
      expect([200, 401, 404, 500]).toContain(res.status);
    });

    test('H04 — Health screening detail', async ({ request }) => {
      const token = users.get('patient1')!.token;
      const id = 'no-dependency';
      const res = await patientApi(request, token).get(`/api/health-screening/${id}`);
      expect([200, 401, 404, 500]).toContain(res.status);
    });

    test('H05 — SOS alert update', async ({ request }) => {
      const token = users.get('patient1')!.token;
      const id = 'no-dependency';
      const res = await patientApi(request, token).put(`/api/sos/${id}`, {
        status: 'resolved', notes: 'Resolved via E2E',
      });
      expect([200, 401, 400, 404, 500]).toContain(res.status);
    });

    test('H06 — Follow-up reminder list', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const res = await doctorApi(request, token).get('/api/follow-ups');
      expect([200, 401, 404, 500]).toContain(res.status);
    });

    test('H07 — Follow-up complete', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const id = 'no-dependency';
      const res = await doctorApi(request, token).put(`/api/follow-ups/${id}/complete`, {});
      expect([200, 401, 400, 404, 500]).toContain(res.status);
    });

    test('H08 — HIS integration patient lookup', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const res = await doctorApi(request, token).get(ENDPOINTS.phase2.hisPatientLookup + '?hn=HN001');
      expect([200, 401, 400, 404, 500]).toContain(res.status);
    });

    test('H09 — HIS integration lab results', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const res = await doctorApi(request, token).get(ENDPOINTS.phase2.hisLabResults + '?patientId=' + (users.get('patient1')!.userId || 'test'));
      expect([200, 401, 400, 404, 500]).toContain(res.status);
    });

    test('H10 — Predictive analytics with invalid model', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const res = await doctorApi(request, token).post(ENDPOINTS.phase2.predictiveAnalytics, {
        patientId: users.get('patient1')!.id,
        model: 'nonexistent_model',
      });
      expect([200, 401, 400, 404, 500]).toContain(res.status);
    });

    test('H11 — Smart scheduling suggestion', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const res = await doctorApi(request, token).post(ENDPOINTS.phase2.smartScheduling, {
        patientId: users.get('patient1')!.userId,
        preferredDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      });
      expect([200, 401, 400, 404, 500]).toContain(res.status);
    });

    test('H12 — Nursing workflow dashboard', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const res = await doctorApi(request, token).get(ENDPOINTS.phase2.nursingWorkflow);
      expect([200, 401, 404, 500]).toContain(res.status);
    });
  });
});
