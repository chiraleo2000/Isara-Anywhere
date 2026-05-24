/**
 * Code Breaker Round 1 — cloud: guest drops network mid-lobby, rejoins, no blank Jitsi
 */
import {
  test,
  expect,
  MEETING_URL,
  PATIENT_URL,
  launchVisibleChromium,
  joinMeetingToLobby,
  lobbyJoinUnauth,
} from './helpers/multi-portal';
import { loadWorkflowState } from './helpers/workflow-state';
import { assertNoActiveJitsi } from './helpers/meeting-lifecycle-fixture';
import { CHROMIUM_MEDIA_PERMISSIONS } from './helpers/browser-matrix';

const IS_CLOUD = process.env.TEST_ENV === 'cloud';
const API_TIMEOUT = IS_CLOUD ? 30_000 : 15_000;

test.describe('Code Breaker R1 — network chaos (cloud)', () => {
  test.skip(!IS_CLOUD, 'cloud-only');

  test('CB1-E01 — guest offline mid-lobby then rejoin without blank Jitsi', async ({ portals }) => {
    const { doctor, patient } = portals;
    const ws = loadWorkflowState();
    const appointmentId = ws.appointmentId;
    expect(appointmentId).toBeTruthy();

    const token = await doctor.page.evaluate(() => localStorage.getItem('token') || '');
    const create = await doctor.page.request.post(`${MEETING_URL}/api/meetings/create`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: {
        appointmentId,
        doctorId: 'DOC-TEST-001',
        doctorName: 'Dr. Test',
        patientId: 'PATIENT-DEMO',
        patientName: 'Patient Demo',
      },
      timeout: API_TIMEOUT,
    });
    expect(create.ok()).toBeTruthy();
    const body = await create.json();
    const meetingKey = body.meeting?.id || body.id || appointmentId;

    await doctor.page.goto(`${process.env.CLOUD_DOCTOR_URL}/doctor/DOC-TEST-001/meeting/${appointmentId}`, {
      waitUntil: 'domcontentloaded',
      timeout: 90_000,
    });

    await patient.page.goto(`${PATIENT_URL}/meeting/${appointmentId}`, {
      waitUntil: 'domcontentloaded',
      timeout: 90_000,
    });
    await joinMeetingToLobby(patient.page, 'CB1-patient', portals.patient.browserName);
    await assertNoActiveJitsi(patient.page, 'CB1-patient-lobby');

    const guestBrowser = await launchVisibleChromium('CB1-Guest');
    const guestCtx = await guestBrowser.newContext();
    await guestCtx.grantPermissions(CHROMIUM_MEDIA_PERMISSIONS as unknown as string[]);
    const guestPage = await guestCtx.newPage();

    await guestPage.goto(
      `${PATIENT_URL}/guest-join/${meetingKey}?name=${encodeURIComponent('CB1 Guest')}`,
      { waitUntil: 'domcontentloaded', timeout: 90_000 },
    );
    const joinBtn = guestPage.getByTestId('guest-join-btn');
    if (await joinBtn.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await joinBtn.click();
    }
    await expect(guestPage.getByTestId('guest-lobby-waiting')).toBeVisible({ timeout: 60_000 });
    await assertNoActiveJitsi(guestPage, 'CB1-guest-lobby');

    await test.step('Simulate disconnect mid-lobby', async () => {
      await guestCtx.setOffline(true);
      await guestPage.waitForTimeout(2_000);
      await guestCtx.setOffline(false);
      await guestPage.reload({ waitUntil: 'domcontentloaded' });
      if (await joinBtn.isVisible({ timeout: 8_000 }).catch(() => false)) {
        await joinBtn.click();
      }
      await lobbyJoinUnauth(meetingKey, {
        participantName: 'CB1 Guest',
        participantId: 'guest-cb1-breaker',
        role: 'guest',
      });
    });

    await expect(guestPage.getByTestId('guest-lobby-waiting').or(guestPage.getByTestId('guest-join-btn'))).toBeVisible({
      timeout: 60_000,
    });
    const jitsiFrame = guestPage.locator('[data-testid="jitsi-guest-container"] iframe, [data-testid="jitsi-meeting-container"] iframe');
    const iframeVisible = await jitsiFrame.isVisible({ timeout: 3_000 }).catch(() => false);
    expect(iframeVisible, 'Jitsi must not mount before admit').toBe(false);

    await guestBrowser.close();
  });
});
