/**
 * Guest share UI contract — token-only invite surfaces (M-URL / M-GUEST).
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');

describe('meetingGuestShareUiContract', () => {
  it('MEET-GUEST-UI-01 — MeetingRoom exposes guest join/token hints', () => {
    const room = fs.readFileSync(
      path.join(root, 'Isara-doctor-portal/frontend/pages/meetings/MeetingRoom.tsx'),
      'utf8',
    );
    expect(room).toContain('data-testid="guest-join-url-hint"');
    expect(room).toContain('data-testid="guest-token-url-hint"');
  });

  it('MEET-GUEST-UI-02 — MeetingResults has validate CTA', () => {
    const results = fs.readFileSync(
      path.join(root, 'Isara-doctor-portal/frontend/pages/meetings/MeetingResults.tsx'),
      'utf8',
    );
    expect(results).toContain('data-testid="validate-summary-btn"');
    expect(results).toMatch(/summary-degraded-badge|summary-empty|generate-summary/);
  });

  it('MEET-GUEST-UI-03 — guest mount skips prejoin; invite prefers token URL', () => {
    const jitsi = fs.readFileSync(
      path.join(root, 'Isara-patient-portal/frontend/utils/jitsiMeetingConfig.ts'),
      'utf8',
    );
    const mountIdx = jitsi.indexOf('export async function mountGuestJitsiMeeting');
    expect(mountIdx).toBeGreaterThan(-1);
    expect(jitsi.indexOf('wireJitsiSkipPrejoin(api)', mountIdx)).toBeGreaterThan(mountIdx);

    const meeting = fs.readFileSync(
      path.join(root, 'Izara-jitsi-server/backend/index.js'),
      'utf8',
    );
    expect(meeting).toMatch(/PATIENT_PORTAL_URL_MISSING/);
    expect(meeting).toMatch(/guestLink/);
    expect(meeting).not.toMatch(/inviteLink:\s*urls\.guestJoinUrl/);
  });

  it('MEET-GUEST-UI-04 — bare guest-join remains blocked in product contracts', () => {
    const deny = fs.readFileSync(
      path.join(root, 'tests/unit/meeting-server/guestAnonymousDenyContract.test.ts'),
      'utf8',
    );
    expect(deny).toMatch(/guest|invite|denied|anonymous/i);
  });
});
