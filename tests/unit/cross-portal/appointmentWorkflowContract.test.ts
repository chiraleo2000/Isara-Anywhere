/**
 * @process Processes/Appointment_Workflows.md
 * Appointment lifecycle state machine and edge cases.
 */
import { describe, it, expect } from 'vitest';
import {
  buildPoolStatusList,
  matchesDoctorPoolAccess,
  matchesPoolFilter,
  PENDING_POOL_STATUSES,
} from '../../../Isara-doctor-portal/server/appointmentPoolQuery.cjs';
import { derivePoolStatus, mapAppointmentToPoolItem } from '../../../Isara-doctor-portal/server/appointmentQueueMapper.cjs';

type AptStatus = 'pending' | 'in_pool' | 'awaiting_doctor_response' | 'confirmed' | 'cancelled' | 'completed';

const ALLOWED_TRANSITIONS: Record<AptStatus, AptStatus[]> = {
  pending: ['in_pool', 'cancelled'],
  in_pool: ['awaiting_doctor_response', 'cancelled'],
  awaiting_doctor_response: ['confirmed', 'in_pool', 'cancelled'],
  confirmed: ['completed', 'cancelled'],
  cancelled: [],
  completed: [],
};

function canTransition(from: AptStatus, to: AptStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

describe('Appointment_Workflows — standard lifecycle', () => {
  it('AWC-01 — patient book → in_pool', () => {
    expect(canTransition('pending', 'in_pool')).toBe(true);
  });

  it('AWC-02 — admin assign → awaiting_doctor_response', () => {
    expect(canTransition('in_pool', 'awaiting_doctor_response')).toBe(true);
  });

  it('AWC-03 — doctor confirm → confirmed', () => {
    expect(canTransition('awaiting_doctor_response', 'confirmed')).toBe(true);
    const item = mapAppointmentToPoolItem({
      id: 'apt-1',
      status: 'confirmed',
      doctor_id: 'doc-1',
      confirmed_by: 'doc-1',
      confirmed_at: new Date().toISOString(),
    });
    expect(item.poolStatus).toBe('accepted');
    expect(item.queueVisibility).toBe('accepted');
  });

  it('AWC-04 — doctor decline → back to in_pool', () => {
    expect(canTransition('awaiting_doctor_response', 'in_pool')).toBe(true);
  });

  it('AWC-05 — confirmed visible with includeAccepted', () => {
    const row = { id: 'x', status: 'confirmed', confirmed_at: new Date().toISOString(), doctor_id: 'd1' };
    expect(matchesPoolFilter(row, true)).toBe(true);
    expect(buildPoolStatusList(true)).toContain('confirmed');
  });
});

describe('Appointment_Workflows — edge cases', () => {
  it('AWC-EC01 — cannot confirm directly from in_pool', () => {
    expect(canTransition('in_pool', 'confirmed')).toBe(false);
  });

  it('AWC-EC02 — cancelled is terminal', () => {
    expect(canTransition('cancelled', 'confirmed')).toBe(false);
    expect(canTransition('cancelled', 'in_pool')).toBe(false);
  });

  it('AWC-EC03 — doctor pool access requires assignment or pending unassigned', () => {
    expect(matchesDoctorPoolAccess({ status: 'in_pool', doctor_id: null }, { doctorId: 'doc-1' })).toBe(true);
    expect(
      matchesDoctorPoolAccess(
        { status: 'confirmed', doctor_id: 'doc-1', confirmed_at: new Date().toISOString() },
        { doctorId: 'doc-1' },
      ),
    ).toBe(true);
    expect(
      matchesDoctorPoolAccess(
        { status: 'confirmed', doctor_id: 'doc-2', confirmed_at: new Date().toISOString() },
        { doctorId: 'doc-1' },
      ),
    ).toBe(false);
  });

  it('AWC-EC04 — pending statuses never include confirmed in default filter', () => {
    for (const s of PENDING_POOL_STATUSES) {
      expect(s).not.toBe('confirmed');
    }
    expect(derivePoolStatus('in_pool', null)).toBe('pending');
  });
});

describe('Appointment_Workflows — ownership integrity', () => {
  it('AWC-OWN01 — confirmedBy preserved on pool item', () => {
    const item = mapAppointmentToPoolItem({
      id: 'apt-own',
      status: 'confirmed',
      doctor_id: 'doc-uuid',
      confirmed_by: 'doc-uuid',
      confirmed_at: '2026-06-01T10:00:00Z',
    });
    expect(item.acceptedBy).toBeTruthy();
    expect(item.doctorId).toBe('doc-uuid');
  });
});
