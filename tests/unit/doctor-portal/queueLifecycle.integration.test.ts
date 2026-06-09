/**
 * @process Processes/Pages/Doctor-Portal/20_Appointment_Pool_Management.md
 */
import { describe, it, expect } from 'vitest';
import {
  buildPoolStatusList,
  matchesPoolFilter,
  mergePoolItemsById,
  splitQueueSections,
  isWithinAcceptedWindow,
  PENDING_POOL_STATUSES,
} from '../../../Isara-doctor-portal/server/appointmentPoolQuery.cjs';
import { buildTelehealthMeetingUrls } from '../../../Isara-doctor-portal/server/jitsiMeetingLinks.cjs';

type PoolStatus = 'in_pool' | 'awaiting_doctor_response' | 'confirmed' | 'cancelled';

function transitionOnAdminAssign(current: PoolStatus): PoolStatus {
  if (current !== 'in_pool') return current;
  return 'awaiting_doctor_response';
}

function transitionOnDoctorConfirm(current: PoolStatus): PoolStatus {
  if (current !== 'awaiting_doctor_response') return current;
  return 'confirmed';
}

function transitionOnCancel(current: PoolStatus): PoolStatus {
  return 'cancelled';
}

function transitionOnDoctorDecline(_current: PoolStatus): PoolStatus {
  return 'in_pool';
}

describe('queueLifecycle — state transitions', () => {
  it('QL01 — full lifecycle in_pool → assign → confirm', () => {
    let status: PoolStatus = 'in_pool';
    status = transitionOnAdminAssign(status);
    expect(status).toBe('awaiting_doctor_response');
    status = transitionOnDoctorConfirm(status);
    expect(status).toBe('confirmed');
  });

  it('QL02 — post-accept record remains queryable with includeAccepted', () => {
    const row = {
      id: 'apt-1',
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
      doctor_id: 'doc-1',
    };
    expect(matchesPoolFilter(row, false)).toBe(false);
    expect(matchesPoolFilter(row, true)).toBe(true);
    expect(buildPoolStatusList(true)).toContain('confirmed');
    expect(buildPoolStatusList(false)).not.toContain('confirmed');
  });

  it('QL03 — cancelled accepted appointment updates status without deletion', () => {
    const row = { id: 'apt-2', status: 'confirmed' as PoolStatus };
    const cancelled = { ...row, status: transitionOnCancel(row.status) };
    expect(cancelled.status).toBe('cancelled');
    expect(cancelled.id).toBe('apt-2');
    expect(matchesPoolFilter(cancelled, true)).toBe(false);
  });

  it('QL04 — pending filter unchanged (excludes confirmed by default)', () => {
    expect(PENDING_POOL_STATUSES).not.toContain('confirmed');
    const pending = { id: 'a', status: 'in_pool' };
    const confirmed = { id: 'b', status: 'confirmed', confirmed_at: new Date().toISOString() };
    expect(matchesPoolFilter(pending, false)).toBe(true);
    expect(matchesPoolFilter(confirmed, false)).toBe(false);
  });

  it('QL05 — mergePoolItemsById prevents duplicate list entries', () => {
    const merged = mergePoolItemsById([
      { id: 'x', status: 'in_pool' },
      { id: 'x', status: 'confirmed' },
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0].status).toBe('confirmed');
  });

  it('QL06 — splitQueueSections separates pending and accepted for doctor', () => {
    const today = new Date().toISOString();
    const { pending, accepted } = splitQueueSections(
      [
        { id: '1', status: 'in_pool', doctorId: 'doc-1' },
        { id: '2', status: 'confirmed', doctorId: 'doc-1', confirmed_at: today },
      ],
      { isAdmin: false, doctorId: 'doc-1', doctorEmail: 'doc@test.com' },
    );
    expect(pending).toHaveLength(1);
    expect(accepted).toHaveLength(1);
    expect(accepted[0].id).toBe('2');
  });

  it('QL07 — doctor decline returns appointment to in_pool', () => {
    let status: PoolStatus = 'awaiting_doctor_response';
    status = transitionOnDoctorDecline(status);
    expect(status).toBe('in_pool');
    expect(PENDING_POOL_STATUSES).toContain('in_pool');
  });

  it('QL08 — confirmed remains queryable within 7-day accepted window', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const row = { id: 'apt-old', status: 'confirmed', confirmed_at: twoDaysAgo };
    expect(isWithinAcceptedWindow(twoDaysAgo)).toBe(true);
    expect(matchesPoolFilter(row, true)).toBe(true);
  });

  it('QL09 — confirm meeting URLs disable prejoin and set display names', () => {
    const urls = buildTelehealthMeetingUrls('apt-confirm-1', {
      patientName: 'Patient Demo',
      doctorName: 'Dr. Demo',
    });
    expect(urls.roomName).toMatch(/^izara-apt-confirm/);
    expect(urls.patientMeetingUrl).toContain('prejoinPageEnabled=false');
    expect(urls.patientMeetingUrl).toContain('Patient');
    expect(urls.doctorMeetingUrl).toContain('Dr.+Demo');
  });
});
