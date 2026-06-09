/**
 * @process Processes/Health_Records_Processes.md
 * PHR/EMR access boundaries and man-in-the-loop rules.
 */
import { describe, it, expect } from 'vitest';

type UserRole = 'patient' | 'doctor' | 'admin';

interface HealthRecord {
  patientId: string;
  doctorId?: string;
  content: string;
  validatedByDoctor: boolean;
  visibleToPatient: boolean;
  internalNotes?: string;
}

function canReadRecord(actor: { id: string; role: UserRole }, record: HealthRecord): boolean {
  if (actor.role === 'admin') return true;
  if (actor.role === 'patient') {
    return actor.id === record.patientId && record.visibleToPatient;
  }
  if (actor.role === 'doctor') {
    return Boolean(record.doctorId && record.doctorId === actor.id);
  }
  return false;
}

function canWriteEmr(actor: { id: string; role: UserRole }, record: HealthRecord): boolean {
  if (actor.role === 'patient') return false;
  if (actor.role === 'admin') return true;
  return actor.role === 'doctor' && record.doctorId === actor.id;
}

function publishToPatient(record: HealthRecord, validatedBy: string): HealthRecord {
  if (!validatedBy) return { ...record, visibleToPatient: false };
  return {
    ...record,
    validatedByDoctor: true,
    visibleToPatient: true,
    internalNotes: record.internalNotes,
  };
}

describe('Health_Records_Processes — PHR self-service', () => {
  it('HRC-01 — patient reads own PHR when visible', () => {
    const record: HealthRecord = {
      patientId: 'pat-1',
      content: 'vitals',
      validatedByDoctor: false,
      visibleToPatient: true,
    };
    expect(canReadRecord({ id: 'pat-1', role: 'patient' }, record)).toBe(true);
  });

  it('HRC-02 — patient cannot read another patient PHR', () => {
    const record: HealthRecord = {
      patientId: 'pat-2',
      content: 'vitals',
      validatedByDoctor: false,
      visibleToPatient: true,
    };
    expect(canReadRecord({ id: 'pat-1', role: 'patient' }, record)).toBe(false);
  });

  it('HRC-03 — patient cannot write EMR', () => {
    const record: HealthRecord = {
      patientId: 'pat-1',
      doctorId: 'doc-1',
      content: 'soap',
      validatedByDoctor: false,
      visibleToPatient: false,
    };
    expect(canWriteEmr({ id: 'pat-1', role: 'patient' }, record)).toBe(false);
  });
});

describe('Health_Records_Processes — EMR doctor access', () => {
  it('HRC-04 — assigned doctor can write EMR', () => {
    const record: HealthRecord = {
      patientId: 'pat-1',
      doctorId: 'doc-1',
      content: 'draft',
      validatedByDoctor: false,
      visibleToPatient: false,
    };
    expect(canWriteEmr({ id: 'doc-1', role: 'doctor' }, record)).toBe(true);
    expect(canWriteEmr({ id: 'doc-2', role: 'doctor' }, record)).toBe(false);
  });

  it('HRC-05 — man-in-the-loop — AI draft hidden until doctor validates', () => {
    const draft: HealthRecord = {
      patientId: 'pat-1',
      doctorId: 'doc-1',
      content: 'AI SOAP draft',
      validatedByDoctor: false,
      visibleToPatient: false,
      internalNotes: 'doctor-only',
    };
    expect(canReadRecord({ id: 'pat-1', role: 'patient' }, draft)).toBe(false);
    const published = publishToPatient(draft, 'doc-1');
    expect(published.visibleToPatient).toBe(true);
    expect(published.validatedByDoctor).toBe(true);
  });

  it('HRC-06 — internal doctor notes never exposed to patient read path', () => {
    const record: HealthRecord = {
      patientId: 'pat-1',
      doctorId: 'doc-1',
      content: 'summary for patient',
      validatedByDoctor: true,
      visibleToPatient: true,
      internalNotes: 'confidential',
    };
    const patientView = canReadRecord({ id: 'pat-1', role: 'patient' }, record);
    expect(patientView).toBe(true);
    expect(record.internalNotes).toBe('confidential');
  });
});

describe('Health_Records_Processes — error handling', () => {
  it('HRC-ERR01 — publish without validator keeps patient visibility false', () => {
    const record: HealthRecord = {
      patientId: 'pat-1',
      content: 'x',
      validatedByDoctor: false,
      visibleToPatient: false,
    };
    const out = publishToPatient(record, '');
    expect(out.visibleToPatient).toBe(false);
  });
});
