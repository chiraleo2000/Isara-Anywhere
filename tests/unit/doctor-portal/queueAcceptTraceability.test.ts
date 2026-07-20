/**
 * @process Processes/Pages/Doctor-Portal/20_Appointment_Pool_Management.md
 * @process Defect หมออิสระ.pdf — queue accept must not orphan records
 */
import { describe, it, expect } from 'vitest';
import {
  buildPoolStatusList,
  buildDoctorPoolSqlFilter,
  matchesDoctorPoolAccess,
  matchesPoolFilter,
  splitQueueSections,
} from '../../../../issara-doctor/backend/appointmentPoolQuery.cjs';
import { derivePoolStatus, mapAppointmentToPoolItem } from '../../../../issara-doctor/backend/appointmentQueueMapper.cjs';

describe('queueAcceptTraceability — status transition (no delete)', () => {
  it('QAT01 — accept updates status to confirmed, not removed from includeAccepted list', () => {
    const before = { id: 'apt-1', status: 'awaiting_doctor_response', doctor_id: 'doc-1' };
    const after = {
      ...before,
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
      confirmed_by: 'doc-1',
      confirmed_by_email: 'doc@test.com',
    };
    expect(matchesPoolFilter(before, false)).toBe(true);
    expect(matchesPoolFilter(before, true)).toBe(true);
    expect(matchesPoolFilter(after, false)).toBe(false);
    expect(matchesPoolFilter(after, true)).toBe(true);
  });

  it('QAT02 — default pool status list includes confirmed when includeAccepted', () => {
    expect(buildPoolStatusList(false)).not.toContain('confirmed');
    expect(buildPoolStatusList(true)).toContain('confirmed');
  });

  it('QAT03 — mapper exposes accepted visibility fields for UI traceability', () => {
    const row = {
      id: 'apt-2',
      status: 'confirmed',
      doctor_id: 'doc-1',
      confirmed_at: new Date().toISOString(),
      confirmed_by: 'doc-1',
      confirmed_by_email: 'doc@test.com',
      patient_name: 'Patient',
    };
    const item = mapAppointmentToPoolItem(row);
    expect(item.status).toBe('confirmed');
    expect(item.poolStatus).toBe('accepted');
    expect(item.queueVisibility).toBe('accepted');
    expect(item.acceptedBy).toBe('doc-1');
    expect(item.acceptedByEmail).toBe('doc@test.com');
  });

  it('QAT04 — derivePoolStatus maps confirmed to accepted for pool UI', () => {
    expect(derivePoolStatus('confirmed', 'doc-1')).toBe('accepted');
    expect(derivePoolStatus('in_pool', null)).toBe('pending');
  });
});

describe('queueAcceptTraceability — doctor SQL visibility', () => {
  it('QAT05 — buildDoctorPoolSqlFilter includes confirmed_by match params', () => {
    const { clause, extraParams } = buildDoctorPoolSqlFilter('doc-uuid', 'doc@test.com', 2);
    expect(clause).toContain("a.status = 'confirmed'");
    expect(clause).toContain('confirmed_by');
    expect(extraParams).toEqual(['doc-uuid', 'doc@test.com']);
  });

  it('QAT06 — matchesDoctorPoolAccess allows doctor to see own accepted row', () => {
    const row = {
      status: 'confirmed',
      doctor_id: 'doc-1',
      confirmed_by: 'doc-1',
      confirmed_by_email: 'doc@test.com',
    };
    expect(matchesDoctorPoolAccess(row, { doctorId: 'doc-1', doctorEmail: 'doc@test.com' })).toBe(true);
    expect(matchesDoctorPoolAccess(row, { doctorId: 'other-doc', doctorEmail: 'x@test.com' })).toBe(false);
  });

  it('QAT07 — unassigned in_pool still visible to doctors (pool not broken)', () => {
    expect(matchesDoctorPoolAccess({ status: 'in_pool', doctor_id: null }, { doctorId: 'doc-1' })).toBe(true);
    expect(matchesDoctorPoolAccess({ status: 'pending', doctor_id: null }, { doctorId: 'doc-1' })).toBe(true);
  });
});

describe('queueAcceptTraceability — splitQueueSections', () => {
  it('QAT08 — accepted section retains confirmed after accept transition', () => {
    const confirmedAt = new Date().toISOString();
    const { pending, accepted } = splitQueueSections(
      [
        { id: '1', status: 'in_pool' },
        {
          id: '2',
          status: 'confirmed',
          doctorId: 'doc-1',
          acceptedBy: 'doc-1',
          acceptedAt: confirmedAt,
        },
      ],
      { isAdmin: false, doctorId: 'doc-1', doctorEmail: 'doc@test.com' },
    );
    expect(pending.map((a) => a.id)).toEqual(['1']);
    expect(accepted.map((a) => a.id)).toEqual(['2']);
  });

  it('QAT09 — admin sees all accepted rows in traceability section', () => {
    const { accepted } = splitQueueSections(
      [{ id: 'x', status: 'confirmed', doctorId: 'doc-9', acceptedAt: new Date().toISOString() }],
      { isAdmin: true, doctorId: 'doc-1', doctorEmail: 'a@test.com' },
    );
    expect(accepted).toHaveLength(1);
  });
});

/** Simulates AppointmentPoolManagement client filter — accepted must not be dropped */
function filterPoolListForDisplay(items: Array<{ status?: string; poolStatus?: string; queueVisibility?: string }>) {
  return items.filter((item) => {
    const status = item.status || item.poolStatus;
    if (status === 'confirmed' || item.poolStatus === 'accepted' || item.queueVisibility === 'accepted') {
      return true;
    }
    return ['in_pool', 'pending', 'awaiting_doctor_response', 'pending', 'ai_matched'].includes(String(status));
  });
}

describe('queueAcceptTraceability — frontend pool list filter contract', () => {
  it('QAT10 — accepted/confirmed rows remain in pool list after doctor accept', () => {
    const items = filterPoolListForDisplay([
      { id: 'a', status: 'in_pool' },
      { id: 'b', status: 'confirmed', poolStatus: 'accepted', queueVisibility: 'accepted' },
    ]);
    expect(items.map((i) => i.id)).toEqual(['a', 'b']);
  });
});
