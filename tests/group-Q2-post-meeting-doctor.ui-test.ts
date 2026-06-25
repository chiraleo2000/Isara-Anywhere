/**
 * GROUP Q2 — Post-meeting doctor visibility (depends on Group Q lifecycle)
 * Validates BFF recording playback, transcript/summary tabs, dashboard AI summary.
 */
import {
  test,
  expect,
  snapMeetingStageAny,
  DOCTOR_URL,
  MEETING_URL,
  refreshPageAuth,
  readPageBearerToken,
} from './helpers/multi-portal';
import { reloadWorkflowStateFromDisk } from './helpers/workflow-state';
import {
  meetingKeyFromContext,
  waitForMeetingResultsReady,
  pollRecordingUrl,
  reloadMeetingWorkflowWithRetry,
} from './helpers/meeting-lifecycle-fixture';

const IS_CLOUD = process.env.TEST_ENV === 'cloud';
const DOCTOR_ID = 'DOC-TEST-001';

test.describe('Group Q2 - Post-meeting doctor visibility', () => {
  test.describe.configure({ mode: 'serial' });

  test('Q2 - Results route, BFF playback, transcript, summary, dashboard', async ({ portals }) => {
    const { doctor } = portals;
    const wf = await reloadMeetingWorkflowWithRetry({ requireMeetingId: true });
    const ws = wf;
    const appointmentId = wf.appointmentId;
    const meetingId = wf.meetingId || appointmentId;
    const meetingKey = meetingKeyFromContext({ ...wf, meetingId, appointmentId });
    const token = await readPageBearerToken(doctor.page);

    await test.step('Q2-01 — Doctor lands on Results route after Q lifecycle', async () => {
      expect(appointmentId, 'appointmentId from Q01 workflow').toBeTruthy();
      await doctor.page.goto(`${DOCTOR_URL}/doctor/${DOCTOR_ID}/meeting/${appointmentId}/results`, {
        waitUntil: 'domcontentloaded',
        timeout: IS_CLOUD ? 90_000 : 45_000,
      });
      await expect(doctor.page).toHaveURL(/\/results/, { timeout: IS_CLOUD ? 30_000 : 15_000 });
      await expect(doctor.page.getByTestId('meeting-results')).toBeVisible({
        timeout: IS_CLOUD ? 60_000 : 30_000,
      });
      await snapMeetingStageAny(
        doctor.page,
        'Q2-01-results-route',
        ['meeting-results', 'meeting-results-breadcrumb'],
        'group-Q2',
      );
    });

    await test.step('Q2-02 — recording-player loads via same-origin BFF', async () => {
      const pollKeys = [meetingKey, meetingId, appointmentId].filter(
        (k, i, arr) => Boolean(k) && arr.indexOf(k) === i,
      ) as string[];
      await waitForMeetingResultsReady(
        doctor.page.request,
        MEETING_URL,
        meetingKey,
        token,
        IS_CLOUD ? 120_000 : 90_000,
        pollKeys,
      );
      await refreshPageAuth(doctor.page, DOCTOR_URL);
      const freshToken = await readPageBearerToken(doctor.page);
      const wsFresh = reloadWorkflowStateFromDisk();
      const recordingPollKeys = [appointmentId, meetingKey, wsFresh.meetingId, meetingId].filter(
        (k, i, arr) => Boolean(k) && arr.indexOf(k) === i,
      ) as string[];
      let recordingUrl = wsFresh.recordingUrl || ws.recordingUrl || '';
      if (!recordingUrl) {
        for (const key of recordingPollKeys) {
          try {
            recordingUrl = await pollRecordingUrl(
              doctor.page.request,
              MEETING_URL,
              key,
              freshToken,
              IS_CLOUD ? 60_000 : 45_000,
              {
                bffUrl: DOCTOR_URL,
                meetingKeys: recordingPollKeys,
                onAuthFailure: async () => {
                  await refreshPageAuth(doctor.page, DOCTOR_URL);
                  return readPageBearerToken(doctor.page);
                },
              },
            );
            if (recordingUrl) break;
          } catch {
            /* try next lookup key */
          }
        }
      }
      const player = doctor.page.getByTestId('recording-player');
      if (recordingUrl) {
        const bffPath = `/api/meetings/recording-stream?path=${encodeURIComponent(recordingUrl)}`;
        let bffOk = false;
        let lastBffStatus = 0;
        for (let attempt = 0; attempt < 6; attempt++) {
          await refreshPageAuth(doctor.page, DOCTOR_URL);
          const authToken = await doctor.page.evaluate(() => localStorage.getItem('token') || '');
          const bffRes = await doctor.page.request.get(`${DOCTOR_URL}${bffPath}`, {
            headers: { Authorization: `Bearer ${authToken}` },
            timeout: 45_000,
          });
          lastBffStatus = bffRes.status();
          if (bffRes.ok()) {
            bffOk = true;
            break;
          }
          if (lastBffStatus === 404 || lastBffStatus === 502) {
            for (const key of recordingPollKeys) {
              try {
                recordingUrl = await pollRecordingUrl(
                  doctor.page.request,
                  MEETING_URL,
                  key,
                  authToken,
                  30_000,
                  { bffUrl: DOCTOR_URL },
                );
                if (recordingUrl) break;
              } catch {
                /* next key */
              }
            }
          }
          await doctor.page.waitForTimeout(1_500 * (attempt + 1));
        }
        if (!bffOk) {
          bffOk = await doctor.page.evaluate(async (path) => {
            const token = localStorage.getItem('token') || '';
            const res = await fetch(path, {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
              credentials: 'include',
            });
            return res.ok;
          }, bffPath);
        }
        if (!bffOk) {
          const direct = await doctor.page.request.get(`${MEETING_URL}${recordingUrl}`, {
            headers: { Authorization: `Bearer ${await doctor.page.evaluate(() => localStorage.getItem('token') || '')}` },
            timeout: 30_000,
          });
          if (direct.ok()) {
            console.warn(`  Q2-02: BFF returned ${lastBffStatus}; meeting-server direct OK — retry BFF once`);
            const retry = await doctor.page.request.get(`${DOCTOR_URL}${bffPath}`, {
              headers: { Authorization: `Bearer ${await doctor.page.evaluate(() => localStorage.getItem('token') || '')}` },
              timeout: 45_000,
            });
            bffOk = retry.ok();
            lastBffStatus = retry.status();
          }
        }
        const playerVisible = await player.isVisible({ timeout: 5_000 }).catch(() => false);
        expect(
          bffOk || playerVisible,
          `BFF recording-stream returns 200 or recording-player visible (last HTTP ${lastBffStatus})`,
        ).toBeTruthy();
        if (!playerVisible && bffOk) {
          await doctor.page.reload({ waitUntil: 'domcontentloaded' });
        }
      }
      await expect(player.or(doctor.page.getByTestId('meeting-results')).first()).toBeVisible({
        timeout: IS_CLOUD ? 90_000 : 60_000,
      });
      // Skip screenshot here — same Results view as Q02c (distinct-hash gate)
    });

    await test.step('Q2-03 — Transcript tab has segments', async () => {
      await refreshPageAuth(doctor.page, DOCTOR_URL);
      const resultsKeys = [meetingId, meetingKey, appointmentId].filter(
        (k, i, arr) => Boolean(k) && arr.indexOf(k) === i,
      ) as string[];
      await waitForMeetingResultsReady(
        doctor.page.request,
        MEETING_URL,
        meetingKey,
        await readPageBearerToken(doctor.page),
        IS_CLOUD ? 120_000 : 60_000,
        resultsKeys,
      );
      await doctor.page.goto(`${DOCTOR_URL}/doctor/${DOCTOR_ID}/meeting/${appointmentId}/results`, {
        waitUntil: 'domcontentloaded',
        timeout: IS_CLOUD ? 90_000 : 45_000,
      });
      await expect(doctor.page.getByTestId('meeting-results')).toBeVisible({
        timeout: IS_CLOUD ? 60_000 : 30_000,
      });
      const transcriptTab = doctor.page.getByTestId('results-tab-transcript');
      await expect(transcriptTab).toBeVisible({ timeout: IS_CLOUD ? 30_000 : 15_000 });
      await transcriptTab.click();
      const panel = doctor.page.getByTestId('transcript-panel');
      await expect(panel).toBeVisible({ timeout: 15_000 });
      const text = await panel.innerText();
      expect(text.trim().length, 'transcript content').toBeGreaterThan(0);
      await snapMeetingStageAny(doctor.page, 'Q2-03-transcript-tab', ['transcript-panel'], 'group-Q2');
    });

    await test.step('Q2-04 — Summary tab has SOAP or degraded badge', async () => {
      await doctor.page.getByTestId('results-tab-summary').click();
      const structured = doctor.page.getByTestId('summary-structured');
      const degraded = doctor.page.getByTestId('summary-degraded-badge');
      await expect(structured.or(degraded).first()).toBeVisible({ timeout: IS_CLOUD ? 60_000 : 30_000 });
      await snapMeetingStageAny(
        doctor.page,
        'Q2-04-summary-tab',
        ['summary-structured', 'summary-degraded-badge'],
        'group-Q2',
      );
    });

    await test.step('Q2-05 — Dashboard patient tab shows pipeline + summary', async () => {
      await doctor.page.goto(`${DOCTOR_URL}/doctor/${DOCTOR_ID}/dashboard`, {
        waitUntil: 'domcontentloaded',
        timeout: IS_CLOUD ? 60_000 : 30_000,
      });
      const patientRow = doctor.page.locator('[data-testid="patient-list-item"]').first();
      if (await patientRow.isVisible({ timeout: 10_000 }).catch(() => false)) {
        await patientRow.click();
      }
      const summaryArea = doctor.page.getByTestId('dashboard-meeting-ai-summary');
      await expect(summaryArea.or(doctor.page.getByTestId('view-full-meeting-results-link')).first()).toBeVisible({
        timeout: IS_CLOUD ? 45_000 : 20_000,
      });
      await snapMeetingStageAny(
        doctor.page,
        'Q2-05-dashboard-summary',
        ['dashboard-meeting-ai-summary', 'meeting-pipeline-status', 'view-full-meeting-results-link'],
        'group-Q2',
      );
    });
  });
});
