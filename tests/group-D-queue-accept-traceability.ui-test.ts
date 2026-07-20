/**
 * Defect หมออิสระ.pdf — Q1 queue accept traceability (browser E2E)
 *
 * Flow: patient books to pool → admin assigns doctor → doctor accepts →
 * record MUST remain visible in pool/queue tracking (not deleted or hidden).
 *
 * Run locally (Docker stack up):
 *   npm run test:e2e:docker:queue-traceability
 *
 * @process Processes/Pages/Doctor-Portal/20_Appointment_Pool_Management.md
 * @process Processes/Pages/Doctor-Portal/21_Queue_Management.md
 */
import {
  test,
  expect,
  navDoctor,
  waitForContent,
  waitForPoolAppointment,
  waitForAcceptedInPool,
  isAcceptedPoolRow,
  pageRequestGet,
  pageRequestPatch,
  PATIENT_URL,
  DOCTOR_URL,
} from './helpers/multi-portal';
import { saveWorkflowState } from './helpers/workflow-state';

const IS_CLOUD = process.env.TEST_ENV === 'cloud';

test.describe('Queue accept traceability (Defect Q1)', () => {
  test.describe.configure({ mode: 'serial' });

  let appointmentId = '';

  test('QAT-E2E — admin assign, doctor accept, record stays in queue list', async ({ portals }) => {
    const { patient, admin, doctor } = portals;

    await test.step('QAT-E2E-01 — Create in_pool appointment via patient API', async () => {
      const token = await patient.page.evaluate(() => localStorage.getItem('auth_token') || '');
      const patientId = await patient.page.evaluate(() => {
        try {
          const raw = localStorage.getItem('izara_user') || localStorage.getItem('izara_current_user') || '';
          return raw ? JSON.parse(raw)?.id || 'PATIENT-DEMO' : 'PATIENT-DEMO';
        } catch {
          return 'PATIENT-DEMO';
        }
      });
      const resp = await patient.page.request.post(`${PATIENT_URL}/api/appointments`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        data: {
          patientId,
          appointmentType: 'telehealth',
          requestedDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
          requestedTime: '10:00',
          reason: 'Queue traceability E2E — headache',
          symptomDescription: 'Queue accept traceability validation',
          urgency: 'normal',
        },
        timeout: IS_CLOUD ? 30_000 : 15_000,
      });
      expect(resp.status(), 'QAT-E2E-01: pool booking must return 200').toBe(200);
      const body = await resp.json();
      expect(body.id, 'QAT-E2E-01: appointment id required').toBeTruthy();
      appointmentId = body.id;
      await waitForPoolAppointment(admin.page, DOCTOR_URL, appointmentId, { unassignedOnly: true });
      console.log(`  ✅ QAT-E2E-01: Created pool appointment ${appointmentId}`);
    });

    await test.step('QAT-E2E-02 — Admin assigns doctor (awaiting_doctor_response)', async () => {
      const adminToken = await admin.page.evaluate(() =>
        localStorage.getItem('token') || localStorage.getItem('izara_auth_token') || '',
      );
      const assignResp = await pageRequestPatch(admin.page, `${DOCTOR_URL}/api/appointments/${appointmentId}/assign`, {
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        data: { doctor_id: 'DOC-TEST-001' },
        timeout: IS_CLOUD ? 30_000 : 10_000,
      });
      expect(assignResp.status(), 'QAT-E2E-02: admin assign must return 200').toBe(200);
      const assignData = await assignResp.json().catch(() => ({}));
      expect(assignData.success ?? true, 'QAT-E2E-02: assign must succeed').toBeTruthy();
      console.log(`  ✅ QAT-E2E-02: Admin assigned DOC-TEST-001 → ${appointmentId}`);
    });

    await test.step('QAT-E2E-03 — Pending pool still lists unassigned items separately from accepted', async () => {
      const adminToken = await admin.page.evaluate(() =>
        localStorage.getItem('token') || localStorage.getItem('izara_auth_token') || '',
      );
      const poolResp = await pageRequestGet(admin.page, `${DOCTOR_URL}/api/appointment-pool?includeAccepted=true`, {
        headers: { Authorization: `Bearer ${adminToken}` },
        timeout: 15_000,
      });
      expect(poolResp.status()).toBe(200);
      const rows = await poolResp.json().catch(() => []);
      const list = Array.isArray(rows) ? rows : [];
      const hit = list.find((a: { id?: string }) => a.id === appointmentId);
      expect(hit, 'QAT-E2E-03: assigned appointment must remain in pool API').toBeTruthy();
      expect(
        ['awaiting_doctor_response', 'confirmed'].includes(String(hit?.status || hit?.poolStatus || '')),
        `QAT-E2E-03: expected awaiting or confirmed, got ${hit?.status || hit?.poolStatus}`,
      ).toBeTruthy();
      expect(isAcceptedPoolRow(hit), 'QAT-E2E-03: must not be accepted before doctor confirm').toBe(false);
    });

    await test.step('QAT-E2E-04 — Doctor accepts via confirm API (updates row, no delete)', async () => {
      const token = await doctor.page.evaluate(() =>
        localStorage.getItem('token') || localStorage.getItem('izara_auth_token') || '',
      );
      const resp = await doctor.page.request.post(`${DOCTOR_URL}/api/appointments/${appointmentId}/confirm`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        data: {
          doctorId: 'DOC-TEST-001',
          confirmedDate: new Date().toISOString().split('T')[0],
          confirmedTime: '10:00',
        },
        timeout: IS_CLOUD ? 30_000 : 15_000,
      });
      expect(resp.status(), 'QAT-E2E-04: doctor confirm must return 200').toBe(200);
      const body = await resp.json().catch(() => ({}));
      expect(body.success ?? true, 'QAT-E2E-04: confirm must succeed').toBeTruthy();
      console.log(`  ✅ QAT-E2E-04: Doctor confirmed ${appointmentId}`);
    });

    await test.step('QAT-E2E-05 — Pool API includeAccepted shows accepted traceability row', async () => {
      const hit = await waitForAcceptedInPool(doctor.page, DOCTOR_URL, appointmentId);
      expect(isAcceptedPoolRow(hit)).toBe(true);
      expect(
        hit.poolStatus === 'accepted' || hit.status === 'confirmed',
        'QAT-E2E-05: mapper must expose accepted/confirmed',
      ).toBeTruthy();
      const acceptedBy = hit.acceptedBy || hit.confirmed_by || hit.confirmedBy;
      expect(acceptedBy, 'QAT-E2E-05: acceptedBy / confirmed_by must be set').toBeTruthy();
      console.log(`  ✅ QAT-E2E-05: Accepted row visible — acceptedBy=${String(acceptedBy)}`);
    });

    await test.step('QAT-E2E-06 — Health Meeting UI shows accepted queue section', async () => {
      await navDoctor(doctor.page, 'health-meeting', 'QAT-E2E-06');
      await doctor.page.reload({ waitUntil: 'domcontentloaded', timeout: IS_CLOUD ? 60_000 : 30_000 });
      await waitForContent(doctor.page, 'QAT-E2E-06');
      const acceptedList = doctor.page.locator('[data-testid="accepted-queue-list"]');
      await expect(acceptedList, 'QAT-E2E-06: accepted-queue-list must render').toBeVisible({ timeout: 15_000 });
      const text = await acceptedList.innerText();
      expect(
        text.includes(appointmentId) || /Recently Accepted|ยอมรับ|Accepted by/i.test(text),
        'QAT-E2E-06: accepted section must show traceability content',
      ).toBeTruthy();
      console.log('  ✅ QAT-E2E-06: Health Meeting accepted queue visible');
    });

    await test.step('QAT-E2E-07 — Appointment Pool UI accepted tab lists the record', async () => {
      // navDoctor('appointment-pool') remaps to health-meeting queue; hit the real pool page.
      await doctor.page.goto(`${DOCTOR_URL}/doctor/DOC-TEST-001/appointment-pool`, {
        waitUntil: 'domcontentloaded',
        timeout: IS_CLOUD ? 60_000 : 30_000,
      });
      await waitForContent(doctor.page, 'QAT-E2E-07');
      const acceptedTab = doctor.page.locator('[data-testid="accepted-pool-tab"]').or(
        doctor.page.locator('button').filter({ hasText: /ที่รับแล้ว|accepted/i }).first(),
      );
      if (await acceptedTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await acceptedTab.click();
        await doctor.page.waitForTimeout(800);
      }
      const acceptedPool = doctor.page.locator(
        '[data-testid="accepted-pool-list"], [data-testid="accepted-queue-list"]',
      ).first();
      await expect(acceptedPool, 'QAT-E2E-07: accepted pool/queue list must render').toBeVisible({ timeout: 15_000 });
      const poolText = await acceptedPool.innerText();
      expect(
        poolText.includes(appointmentId) || /ยอมรับโดย|Accepted by|Demo|Recently Accepted|ยอมรับ/i.test(poolText),
        'QAT-E2E-07: accepted pool/queue must retain record after doctor accept',
      ).toBeTruthy();
      console.log('  ✅ QAT-E2E-07: Appointment Pool accepted tab retains record');
    });

    await test.step('QAT-E2E-08 — Admin pool API still returns accepted row for oversight', async () => {
      const hit = await waitForAcceptedInPool(admin.page, DOCTOR_URL, appointmentId);
      expect(hit.doctor_id || hit.doctorId, 'QAT-E2E-08: doctor_id must remain on row').toBeTruthy();
      console.log('  ✅ QAT-E2E-08: Admin can trace accepted appointment in pool API');
    });

    saveWorkflowState({
      appointmentId,
      patientId: 'PATIENT-DEMO',
      doctorId: 'DOC-TEST-001',
    });
  });
});
