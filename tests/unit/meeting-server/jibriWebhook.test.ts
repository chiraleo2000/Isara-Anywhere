/**
 * @process Processes/VIDEO_MEETING_JITSI_GEMINI.md — Jibri webhook contract (root /tests)
 */
import { describe, it, expect } from 'vitest';
import { validateJibriWebhookRequest } from '../../../Izara-jitsi-server/backend/jibriWebhook.js';

describe('jibriWebhook — validation contract', () => {
  const secret = 'unit-test-jibri-secret';

  it('WH-U01 — invalid secret returns 401', () => {
    const r = validateJibriWebhookRequest(
      { meetingId: 'apt-1', videoBase64: 'e30=' },
      { expectedSecret: secret, providedSecret: 'bad' },
    );
    expect(r.ok).toBe(false);
    expect(r.status).toBe(401);
  });

  it('WH-U02 — missing payload returns 400', () => {
    const r = validateJibriWebhookRequest(
      { meetingId: 'apt-1' },
      { expectedSecret: secret, providedSecret: secret },
    );
    expect(r.status).toBe(400);
  });

  it('WH-U03 — valid body returns ok', () => {
    const r = validateJibriWebhookRequest(
      { meetingId: 'apt-1', localFilePath: '/recordings/drop.mp4' },
      { expectedSecret: secret, providedSecret: secret },
    );
    expect(r.ok).toBe(true);
    expect(r.status).toBe(200);
  });
});
