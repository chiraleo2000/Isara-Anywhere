/**
 * @process Processes/POST_MEETING_WORKFLOW.md
 * Polls live :3020 for recordingUrl when MEETING_URL is reachable (skipped otherwise).
 */
import { describe, it, expect } from 'vitest';

const MEETING_URL = (process.env.MEETING_URL || 'http://127.0.0.1:3020').replace(/\/$/, '');
const DOCTOR_URL = (process.env.DOCTOR_URL || 'http://127.0.0.1:3010').replace(/\/$/, '');

async function isServerUp(): Promise<boolean> {
  try {
    const res = await fetch(`${MEETING_URL}/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

function buildMinimalWebmBase64(): string {
  const buf = Buffer.alloc(2048);
  buf.writeUInt32BE(0x1a45dfa3, 0);
  return buf.toString('base64');
}

async function loginDoctor(): Promise<string | null> {
  for (const authPath of ['/api/auth/login', '/auth/login']) {
    const res = await fetch(`${DOCTOR_URL}${authPath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: process.env.TEST_DOCTOR_EMAIL || 'doctor.test@izara.com',
        password: process.env.TEST_DOCTOR_PASSWORD || 'IzaraDoctor@2024',
      }),
    });
    if (!res.ok) continue;
    const body = (await res.json()) as { token?: string; accessToken?: string };
    return body.token || body.accessToken || null;
  }
  return null;
}

describe('recordingRoundTrip.integration', () => {
  it('RRT-01 — save-recording yields recordingUrl on live meeting server', async () => {
    if (!(await isServerUp())) {
      console.log('SKIP: meeting server not reachable at', MEETING_URL);
      return;
    }
    const token = await loginDoctor();
    expect(token, 'doctor login for integration').toBeTruthy();

    const appointmentId = `RRT-${Date.now().toString(36)}`;
    const create = await fetch(`${MEETING_URL}/api/meetings/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        appointmentId,
        patientId: 'PAT-TEST-001',
        doctorId: 'DOC-TEST-001',
        patientName: 'RRT Patient',
        doctorName: 'RRT Doctor',
      }),
    });
    expect(create.ok, `create ${create.status}`).toBe(true);

    await fetch(`${MEETING_URL}/api/meetings/${appointmentId}/host-present`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inJitsi: true }),
    });

    const save = await fetch(`${MEETING_URL}/api/meetings/${appointmentId}/save-recording`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        audioBase64: buildMinimalWebmBase64(),
        mimeType: 'audio/webm',
        durationMs: 5000,
        triggerPostMeetingPipeline: false,
      }),
    });
    expect(save.ok, `save-recording ${save.status}`).toBe(true);
    const saveBody = (await save.json()) as { recordingUrl?: string };
    let url = saveBody.recordingUrl;

    const deadline = Date.now() + 20_000;
    while (!url && Date.now() < deadline) {
      const results = await fetch(`${MEETING_URL}/api/meetings/${appointmentId}/results`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (results.ok) {
        const data = (await results.json()) as { recordingUrl?: string; meeting?: { recordingUrl?: string } };
        url = data.recordingUrl || data.meeting?.recordingUrl;
      }
      if (!url) await new Promise((r) => setTimeout(r, 1500));
    }
    expect(url, 'recordingUrl from results').toBeTruthy();
  }, 60_000);
});
