/**
 * Dev-testing patient lobby auth — session tokens vs meeting-server JWT.
 */
import { describe, it, expect, vi } from 'vitest';
import { resolveDevTestingPatientLobbyUser } from '../../../Izara-jitsi-server/server/meetingAuth.js';

describe('resolveDevTestingPatientLobbyUser', () => {
  it('DTP01 — matches in-memory active meeting patient', async () => {
    const activeMeetings = new Map([
      ['meet-1', { patientId: 'PATIENT-DEMO' }],
    ]);
    const user = await resolveDevTestingPatientLobbyUser(
      {
        isDevTesting: true,
        activeMeetings,
        resolveLobbyKey: async (id: string) => id,
        pool: null,
        dbAvailable: false,
      },
      'meet-1',
      'PATIENT-DEMO',
    );
    expect(user).toEqual({ id: 'PATIENT-DEMO', role: 'patient' });
  });

  it('DTP02 — rejects wrong participant when dev testing', async () => {
    const activeMeetings = new Map([['meet-1', { patientId: 'PATIENT-DEMO' }]]);
    const user = await resolveDevTestingPatientLobbyUser(
      {
        isDevTesting: true,
        activeMeetings,
        resolveLobbyKey: async (id: string) => id,
        pool: null,
        dbAvailable: false,
      },
      'meet-1',
      'OTHER-PATIENT',
    );
    expect(user).toBeNull();
  });

  it('DTP03 — disabled outside dev testing', async () => {
    const activeMeetings = new Map([['meet-1', { patientId: 'PATIENT-DEMO' }]]);
    const user = await resolveDevTestingPatientLobbyUser(
      {
        isDevTesting: false,
        activeMeetings,
        resolveLobbyKey: async (id: string) => id,
        pool: null,
        dbAvailable: false,
      },
      'meet-1',
      'PATIENT-DEMO',
    );
    expect(user).toBeNull();
  });

  it('DTP04 — falls back to DB patient_id', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ patient_id: 'PATIENT-DB' }] });
    const user = await resolveDevTestingPatientLobbyUser(
      {
        isDevTesting: true,
        activeMeetings: new Map(),
        resolveLobbyKey: async (id: string) => id,
        pool: { query },
        dbAvailable: true,
      },
      'APT-100',
      'PATIENT-DB',
    );
    expect(user).toEqual({ id: 'PATIENT-DB', role: 'patient' });
    expect(query).toHaveBeenCalled();
  });
});
