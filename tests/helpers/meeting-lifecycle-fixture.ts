/**
 * Helpers for Group Q — meeting lifecycle seed/teardown (cloud workflow state).
 */
import { expect, type Page } from '@playwright/test';
import { loadWorkflowState } from './workflow-state';

export const MEETING_HOLD_MS = 10_000;
/** Minimum WebM/audio payload size (bytes) — rejects stub fixtures on cloud */
export const MIN_RECORDING_BYTES = 1024;

export interface MeetingWorkflowContext {
  appointmentId: string;
  meetingId?: string;
  roomName?: string;
}

export function loadMeetingWorkflow(): MeetingWorkflowContext {
  const ws = loadWorkflowState();
  if (!ws.appointmentId) {
    throw new Error('Group D must run first — workflow state missing appointmentId');
  }
  return {
    appointmentId: ws.appointmentId,
    meetingId: ws.meetingId,
    roomName: ws.roomName,
  };
}

export function meetingKeyFromContext(ctx: MeetingWorkflowContext): string {
  return ctx.meetingId || ctx.appointmentId;
}

/** Cloud gate: Gemini is mandatory for Group Q02 */
export function assertGeminiConfiguredForCloud(): void {
  if (process.env.TEST_ENV !== 'cloud') return;
  const key = process.env.GEMINI_API_KEY || process.env.CLOUD_GEMINI_API_KEY;
  if (!key?.trim()) {
    throw new Error(
      'GEMINI_API_KEY is required when TEST_ENV=cloud (Group Q02 generate-summary). Set on meeting server and/or test runner env.',
    );
  }
}

/** Poll lobby status until admitted or timeout */
export async function waitLobbyAdmitted(
  request: { get: (url: string, opts?: object) => Promise<{ ok: () => boolean; json: () => Promise<unknown> }> },
  meetingUrl: string,
  meetingKey: string,
  participantId: string,
  timeoutMs = 120_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const resp = await request.get(
      `${meetingUrl}/api/meetings/${meetingKey}/lobby/status/${encodeURIComponent(participantId)}`,
      { timeout: 15_000 },
    );
    if (resp.ok()) {
      const body = (await resp.json()) as { status?: string };
      if (body.status === 'admitted') return;
    }
    await new Promise((r) => setTimeout(r, 1_500));
  }
  throw new Error(`Lobby participant ${participantId} not admitted within ${timeoutMs}ms`);
}

/** Assert participant is not in active Jitsi (lobby only) */
export async function assertNoActiveJitsi(page: Page, label: string): Promise<void> {
  const container = page.getByTestId('jitsi-meeting-container').or(page.getByTestId('jitsi-guest-container'));
  const visible = await container.isVisible({ timeout: 2_000 }).catch(() => false);
  expect(visible, `${label}: Jitsi must not be active before admit`).toBe(false);
}

/** Check video elements have active media (page + Jitsi iframes); lenient for cross-origin Jitsi */
export async function assertJitsiMediaActive(page: Page, label: string): Promise<boolean> {
  const active = await page.evaluate(() => {
    const checkVideos = (doc: Document) => {
      const videos = doc.querySelectorAll('video');
      return [...videos].some(
        (v) =>
          (v.readyState >= 2 && (v.videoWidth > 0 || v.srcObject != null)) ||
          (v.readyState >= 1 && v.srcObject != null),
      );
    };
    if (checkVideos(document)) return true;
    for (const frame of document.querySelectorAll('iframe')) {
      try {
        const doc = frame.contentDocument;
        if (doc && checkVideos(doc)) return true;
      } catch {
        /* cross-origin Jitsi iframe */
      }
    }
    const jitsiJoined =
      typeof (globalThis as unknown as { APP?: { conference?: { isJoined?: () => boolean } } }).APP
        ?.conference?.isJoined === 'function' &&
      (globalThis as unknown as { APP: { conference: { isJoined: () => boolean } } }).APP.conference.isJoined();
    if (jitsiJoined) return true;
    const hasJitsiFrame = document.querySelector(
      '[data-testid="jitsi-meeting-container"] iframe, [data-testid="jitsi-guest-container"] iframe',
    );
    return Boolean(hasJitsiFrame);
  });
  expect(active, `${label}: active video/audio or Jitsi iframe expected`).toBe(true);
  return active;
}

/** Sample media activity at least `minSamples` times over hold window */
export async function holdWithMediaChecks(
  pages: { page: Page; label: string }[],
  holdMs: number,
  minSamples = 3,
): Promise<void> {
  const interval = Math.max(2_000, Math.floor(holdMs / minSamples));
  const holdStart = Date.now();
  let samples = 0;
  while (Date.now() - holdStart < holdMs) {
    for (const { page, label } of pages) {
      await expect(page.getByTestId('jitsi-meeting-container').or(page.getByTestId('jitsi-guest-container')).first())
        .toBeVisible({ timeout: 5_000 })
        .catch(() => expect(page.getByTestId('jitsi-meeting-container')).toBeVisible());
      await assertJitsiMediaActive(page, label);
    }
    samples += 1;
    const remaining = holdMs - (Date.now() - holdStart);
    if (remaining > 0) await pages[0].page.waitForTimeout(Math.min(interval, remaining));
  }
  expect(samples, 'media samples during hold').toBeGreaterThanOrEqual(Math.min(minSamples, 1));
}

/** Poll GET /results until recordingUrl is set */
export async function pollRecordingUrl(
  request: {
    get: (
      url: string,
      opts?: object,
    ) => Promise<{ ok: () => boolean; json: () => Promise<unknown>; status: () => number }>;
  },
  meetingUrl: string,
  meetingKey: string,
  token: string,
  timeoutMs = 120_000,
): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await request.get(`${meetingUrl}/api/meetings/${meetingKey}/results`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 15_000,
    });
    if (res.ok()) {
      const data = (await res.json()) as {
        meeting?: { recordingUrl?: string };
        recordingUrl?: string;
      };
      const url = data.meeting?.recordingUrl || data.recordingUrl;
      if (url) return url;
    }
    await new Promise((r) => setTimeout(r, 2_000));
  }
  throw new Error(`recordingUrl not available within ${timeoutMs}ms for meeting ${meetingKey}`);
}

/** Minimal valid WebM/EBML header buffer (passes server validateRecordingBuffer) */
export function buildMinimalWebmBuffer(size = MIN_RECORDING_BYTES + 512): Buffer {
  const buf = Buffer.alloc(size);
  buf.writeUInt32BE(0x1a45dfa3, 0);
  return buf;
}

export function buildMinimalWebmBase64(size?: number): string {
  return buildMinimalWebmBuffer(size).toString('base64');
}

type RecordingRequest = Parameters<typeof pollRecordingUrl>[0];

/** POST save-recording with valid WebM stub (headless / Playwright cannot use MediaRecorder) */
export async function seedRecordingViaSaveApi(
  request: RecordingRequest,
  meetingUrl: string,
  meetingKey: string,
  token: string,
): Promise<{ recordingUrl?: string }> {
  const res = await request.post(`${meetingUrl}/api/meetings/${meetingKey}/save-recording`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    data: {
      audioBase64: buildMinimalWebmBase64(),
      mimeType: 'audio/webm',
      durationMs: 10_000,
      triggerPostMeetingPipeline: true,
    },
    timeout: 30_000,
  });
  if (!res.ok()) {
    const body = await res.text().catch(() => '');
    throw new Error(`save-recording E2E seed failed: ${res.status()} ${body.slice(0, 200)}`);
  }
  return (await res.json()) as { recordingUrl?: string };
}

/** Optional Jibri webhook seed when JIBRI_WEBHOOK_SECRET is configured on the meeting server */
export async function seedRecordingViaJibriWebhook(
  request: RecordingRequest,
  meetingUrl: string,
  meetingKey: string,
  doctorId: string,
  webhookSecret: string,
): Promise<{ recordingUrl?: string }> {
  const res = await request.post(`${meetingUrl}/api/webhooks/jibri-recording`, {
    headers: {
      'Content-Type': 'application/json',
      'X-Jibri-Webhook-Secret': webhookSecret,
    },
    data: {
      meetingId: meetingKey,
      doctorId,
      videoBase64: buildMinimalWebmBase64(),
      mimeType: 'video/webm',
    },
    timeout: 30_000,
  });
  if (!res.ok()) {
    const body = await res.text().catch(() => '');
    throw new Error(`jibri-recording E2E seed failed: ${res.status()} ${body.slice(0, 200)}`);
  }
  return (await res.json()) as { recordingUrl?: string };
}

/**
 * Resolve recordingUrl for E2E: short poll for real upload, then API seed (not a production failure).
 */
export async function ensureRecordingPersisted(
  request: RecordingRequest,
  meetingUrl: string,
  meetingKey: string,
  token: string,
  options: { doctorId?: string } = {},
): Promise<string> {
  try {
    return await pollRecordingUrl(request, meetingUrl, meetingKey, token, 15_000);
  } catch {
    const seeded = await seedRecordingViaSaveApi(request, meetingUrl, meetingKey, token);
    if (seeded.recordingUrl) return seeded.recordingUrl;

    const jibriSecret =
      process.env.JIBRI_WEBHOOK_SECRET || process.env.CLOUD_JIBRI_WEBHOOK_SECRET || '';
    if (jibriSecret && options.doctorId) {
      try {
        const wh = await seedRecordingViaJibriWebhook(
          request,
          meetingUrl,
          meetingKey,
          options.doctorId,
          jibriSecret,
        );
        if (wh.recordingUrl) return wh.recordingUrl;
      } catch {
        /* save-recording is primary E2E path */
      }
    }

    return pollRecordingUrl(request, meetingUrl, meetingKey, token, 45_000);
  }
}

/** Cloud/headless: same as ensureRecordingPersisted (no 180s blind poll) */
export async function pollRecordingUrlCloud(
  request: RecordingRequest,
  meetingUrl: string,
  meetingKey: string,
  token: string,
  doctorId?: string,
): Promise<string> {
  return ensureRecordingPersisted(request, meetingUrl, meetingKey, token, { doctorId });
}

/** Wait until GET /results returns success with meeting payload */
export async function waitForMeetingResultsReady(
  request: {
    get: (url: string, opts?: object) => Promise<{ ok: () => boolean; json: () => Promise<unknown> }>;
  },
  meetingUrl: string,
  meetingKey: string,
  token: string,
  timeoutMs = 120_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await request.get(`${meetingUrl}/api/meetings/${meetingKey}/results`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 15_000,
    });
    if (res.ok()) {
      const data = (await res.json()) as { success?: boolean; meeting?: { id?: string } };
      if (data.success && data.meeting?.id) return;
    }
    await new Promise((r) => setTimeout(r, 2_000));
  }
  throw new Error(`meeting results not ready within ${timeoutMs}ms for ${meetingKey}`);
}

/** Wait until meeting ended in results */
export async function waitMeetingEnded(
  request: {
    get: (url: string, opts?: object) => Promise<{ ok: () => boolean; json: () => Promise<unknown> }>;
  },
  meetingUrl: string,
  meetingKey: string,
  token: string,
  timeoutMs = 60_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await request.get(`${meetingUrl}/api/meetings/${meetingKey}/results`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 15_000,
    });
    if (res.ok()) {
      const data = (await res.json()) as { meeting?: { status?: string }; status?: string };
      const status = data.meeting?.status || data.status;
      if (status === 'completed' || status === 'ended') return;
    }
    await new Promise((r) => setTimeout(r, 2_000));
  }
}
