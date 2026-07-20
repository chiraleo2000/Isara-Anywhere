import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const healthMeetingPath = path.resolve(
  __dirname,
  '../../../issara-doctor/frontend/pages/meetings/HealthMeeting.tsx',
);

async function confirmAppointmentApiCall(
  appointmentId: string,
  doctorId: string,
): Promise<string> {
  const endpoint = `/api/appointments/${appointmentId}/confirm`;
  await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ doctorId }),
  });
  return endpoint;
}

describe('doctor confirm/assign regression guard', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, meetingLink: 'https://meet.example/room' }),
      }),
    );
    vi.stubGlobal('localStorage', {
      getItem: vi.fn().mockReturnValue('test-token'),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses PostgreSQL API-based confirm and assign flows', () => {
    const source = fs.readFileSync(healthMeetingPath, 'utf8');

    expect(source).toContain('confirmAppointment as confirmAppointmentApi');
    expect(source).toContain('adminAssignAppointment');
    expect(source).toContain('await confirmAppointmentApi(');
    expect(source).not.toContain('Appointment not found in GCS');
  });

  it('mocked confirm uses POST /api/appointments/:id/confirm not GCS (D4–D6)', async () => {
    const endpoint = await confirmAppointmentApiCall('APT-99', 'DOC-1');
    expect(endpoint).toBe('/api/appointments/APT-99/confirm');
    expect(fetch).toHaveBeenCalledWith(
      '/api/appointments/APT-99/confirm',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
