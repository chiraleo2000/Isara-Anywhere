/**
 * @process Processes/VIDEO_MEETING_JITSI_GEMINI.md
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');
const proxy = fs.readFileSync(
  path.join(root, 'issara-patient/backend/routes/video-meeting-proxy.ts'),
  'utf8',
);

describe('patient meetingJoinProxy — /api/video-meeting BFF', () => {
  it('MJP-01 — create maps to meeting-server /api/meetings/create', () => {
    expect(proxy).toMatch(/\/api\/meetings\/create/);
  });

  it('MJP-02 — join maps to lobby/join', () => {
    expect(proxy).toMatch(/lobby\/join/);
  });

  it('MJP-03 — end maps to meeting end', () => {
    expect(proxy).toMatch(/\/end/);
  });

  it('MJP-04 — summarize maps to generate-summary', () => {
    expect(proxy).toMatch(/generate-summary/);
  });
});
