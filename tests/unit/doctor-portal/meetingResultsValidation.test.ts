/**
 * @process Processes/POST_MEETING_WORKFLOW.md
 * Doctor man-in-the-loop meeting results validation (MRV-01–05).
 */
import { describe, it, expect } from 'vitest';

interface MeetingRecord {
  doctor_validation_status: 'pending' | 'approved' | 'rejected';
  ready_for_patient: boolean;
  validated_at: string | null;
  soap: { subjective?: string; objective?: string; assessment?: string; plan?: string };
  audit: string[];
}

function isSoapComplete(soap: MeetingRecord['soap']): boolean {
  return Boolean(soap.subjective && soap.objective && soap.assessment && soap.plan);
}

function approveMeetingResults(record: MeetingRecord, doctorId: string): MeetingRecord {
  if (!isSoapComplete(record.soap)) return record;
  return {
    ...record,
    doctor_validation_status: 'approved',
    ready_for_patient: true,
    validated_at: new Date().toISOString(),
    audit: [...record.audit, `approved:${doctorId}`],
  };
}

function rejectMeetingResults(record: MeetingRecord, doctorId: string, reason: string): MeetingRecord {
  return {
    ...record,
    doctor_validation_status: 'rejected',
    ready_for_patient: false,
    audit: [...record.audit, `rejected:${doctorId}:${reason}`],
  };
}

function editMeetingResults(record: MeetingRecord, doctorId: string, patch: Partial<MeetingRecord['soap']>): MeetingRecord {
  return {
    ...record,
    soap: { ...record.soap, ...patch },
    audit: [...record.audit, `edited:${doctorId}`],
  };
}

function buildEmrPrefill(record: MeetingRecord): Record<string, string> | null {
  if (record.doctor_validation_status !== 'approved') return null;
  return {
    subjective: record.soap.subjective ?? '',
    objective: record.soap.objective ?? '',
    assessment: record.soap.assessment ?? '',
    plan: record.soap.plan ?? '',
  };
}

const baseRecord = (): MeetingRecord => ({
  doctor_validation_status: 'pending',
  ready_for_patient: false,
  validated_at: null,
  soap: {
    subjective: 'Headache 2 days',
    objective: 'BP 120/80',
    assessment: 'Tension headache',
    plan: 'Rest, fluids',
  },
  audit: [],
});

describe('meetingResultsValidation — MRV', () => {
  it('MRV-01 — doctor approve sets validated_at and unlocks patient view', () => {
    const approved = approveMeetingResults(baseRecord(), 'DOC-TEST-001');
    expect(approved.doctor_validation_status).toBe('approved');
    expect(approved.ready_for_patient).toBe(true);
    expect(approved.validated_at).toBeTruthy();
  });

  it('MRV-02 — reject keeps ready_for_patient=false', () => {
    const rejected = rejectMeetingResults(baseRecord(), 'DOC-TEST-001', 'incomplete');
    expect(rejected.doctor_validation_status).toBe('rejected');
    expect(rejected.ready_for_patient).toBe(false);
  });

  it('MRV-03 — incomplete SOAP blocks approve', () => {
    const incomplete = { ...baseRecord(), soap: { subjective: 'only' } };
    const result = approveMeetingResults(incomplete, 'DOC-TEST-001');
    expect(result.doctor_validation_status).toBe('pending');
    expect(result.ready_for_patient).toBe(false);
  });

  it('MRV-04 — edit preserves audit trail', () => {
    const edited = editMeetingResults(baseRecord(), 'DOC-TEST-001', { plan: 'Ibuprofen PRN' });
    expect(edited.soap.plan).toBe('Ibuprofen PRN');
    expect(edited.audit).toContain('edited:DOC-TEST-001');
  });

  it('MRV-05 — approve triggers EMR editor prefill payload', () => {
    const approved = approveMeetingResults(baseRecord(), 'DOC-TEST-001');
    const prefill = buildEmrPrefill(approved);
    expect(prefill).not.toBeNull();
    expect(prefill!.assessment).toBe('Tension headache');
  });
});
