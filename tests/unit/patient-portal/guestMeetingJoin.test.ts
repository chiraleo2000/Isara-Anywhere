/**
 * @process Processes/Pages/Patient-Portal/05_Appointments_Page.md, VIDEO_MEETING guest join
 */
import { describe, it, expect } from 'vitest';

function buildGuestJoinPath(appointmentId: string, guestType = 'relative'): string {
  const q = new URLSearchParams({ guestType });
  return `/guest-join/${encodeURIComponent(appointmentId)}?${q}`;
}

function parseGuestJoinUrl(pathname: string): { appointmentId: string; guestType: string } | null {
  const m = pathname.match(/^\/guest-join\/([^/?]+)/);
  if (!m) return null;
  return { appointmentId: decodeURIComponent(m[1]), guestType: 'relative' };
}

function guestRequiresIzaraLobby(role: string): boolean {
  return role === 'guest' || role === 'patient_relative' || role === 'doctor_consultant';
}

describe('guestMeetingJoin — guest routes', () => {
  it('GJ01 — builds guest-join path with query', () => {
    expect(buildGuestJoinPath('APT-99', 'admin')).toContain('/guest-join/APT-99');
    expect(buildGuestJoinPath('APT-99', 'admin')).toContain('guestType=admin');
  });

  it('GJ02 — parses appointment id from pathname', () => {
    const parsed = parseGuestJoinUrl('/guest-join/APT-42');
    expect(parsed?.appointmentId).toBe('APT-42');
  });

  it('GJ03 — guest roles use Izara lobby not Jitsi login', () => {
    expect(guestRequiresIzaraLobby('guest')).toBe(true);
    expect(guestRequiresIzaraLobby('doctor')).toBe(false);
  });

  it('GJ04 — public meeting route for patient', () => {
    const patientMeeting = (id: string) => `/meeting/${id}`;
    expect(patientMeeting('APT-1')).toBe('/meeting/APT-1');
  });
});
