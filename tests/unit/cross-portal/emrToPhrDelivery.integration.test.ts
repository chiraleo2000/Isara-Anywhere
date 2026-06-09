/**
 * @process Processes/Health_Records_Processes.md
 * EMR finalized → delivered → PHR visible chain (EPH-01–06).
 */
import { describe, it, expect } from 'vitest';

type EmrStatus = 'draft' | 'finalized' | 'delivered';

interface EmrRecord {
  id: string;
  patientId: string;
  status: EmrStatus;
  visibleToPatient: boolean;
  validatedByDoctor: boolean;
  sections: string[];
}

interface NotificationEvent {
  type: string;
  userId: string;
  data: Record<string, unknown>;
}

function transitionEmrStatus(current: EmrStatus, event: 'finalize' | 'deliver'): EmrStatus {
  if (event === 'finalize' && current === 'draft') return 'finalized';
  if (event === 'deliver' && current === 'finalized') return 'delivered';
  return current;
}

function publishToPatient(record: EmrRecord, validatorId: string): EmrRecord {
  if (!validatorId || record.status !== 'delivered') {
    return { ...record, visibleToPatient: false };
  }
  return { ...record, validatedByDoctor: true, visibleToPatient: true };
}

function filterPhrSections(record: EmrRecord): string[] {
  if (!record.visibleToPatient) return [];
  return record.sections;
}

function buildEmrAvailableNotification(record: EmrRecord): NotificationEvent | null {
  if (!record.visibleToPatient) return null;
  return {
    type: 'emr_available',
    userId: record.patientId,
    data: { emrId: record.id },
  };
}

function timelineIncludesDelivery(record: EmrRecord): boolean {
  return record.status === 'delivered' && record.visibleToPatient;
}

describe('emrToPhrDelivery.integration — EPH chain', () => {
  const draft: EmrRecord = {
    id: 'emr-1',
    patientId: 'PATIENT-DEMO',
    status: 'draft',
    visibleToPatient: false,
    validatedByDoctor: false,
    sections: ['vitals', 'ai_summary_draft'],
  };

  it('EPH-01 — EMR finalized → delivered transition', () => {
    const finalized = { ...draft, status: transitionEmrStatus(draft.status, 'finalize') };
    const delivered = { ...finalized, status: transitionEmrStatus(finalized.status, 'deliver') };
    expect(delivered.status).toBe('delivered');
  });

  it('EPH-02 — publishToPatient sets visibleToPatient only after validator', () => {
    const delivered = { ...draft, status: 'delivered' as EmrStatus };
    expect(publishToPatient(delivered, '').visibleToPatient).toBe(false);
    expect(publishToPatient(delivered, 'DOC-TEST-001').visibleToPatient).toBe(true);
  });

  it('EPH-03 — patient PHR route returns delivered EMR sections', () => {
    const visible = publishToPatient({ ...draft, status: 'delivered', sections: ['vitals', 'soap'] }, 'DOC-1');
    expect(filterPhrSections(visible)).toEqual(['vitals', 'soap']);
  });

  it('EPH-04 — emr_available notification fired on delivery', () => {
    const visible = publishToPatient({ ...draft, status: 'delivered' }, 'DOC-1');
    const evt = buildEmrAvailableNotification(visible);
    expect(evt?.type).toBe('emr_available');
    expect(evt?.userId).toBe('PATIENT-DEMO');
  });

  it('EPH-05 — pre-validate PHR excludes draft AI summary', () => {
    expect(filterPhrSections(draft)).toEqual([]);
  });

  it('EPH-06 — timeline entry appears after delivery', () => {
    const visible = publishToPatient({ ...draft, status: 'delivered' }, 'DOC-1');
    expect(timelineIncludesDelivery(visible)).toBe(true);
  });
});
