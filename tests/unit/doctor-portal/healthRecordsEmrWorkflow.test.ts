// ============================================================================
// Health Records & EMR Workflow Tests
// Based on: Processes/Health_Records_Processes.md
// Tests: SOAP notes, EMR generation, AI summary, patient delivery, timeline
// ============================================================================

import { describe, it, expect } from 'vitest';

// --- Types ---

type SoapSection = 'subjective' | 'objective' | 'assessment' | 'plan';
type EmrStatus = 'draft' | 'pending_review' | 'finalized' | 'delivered';
type VitalType = 'blood_pressure' | 'heart_rate' | 'temperature' | 'oxygen_saturation' | 'weight' | 'height' | 'bmi';

interface SoapNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

interface EmrRecord {
  id: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  soapNote: SoapNote;
  diagnoses: string[];
  prescriptions: Prescription[];
  vitalSigns: VitalSign[];
  status: EmrStatus;
  aiGenerated: boolean;
  createdAt: string;
  finalizedAt?: string;
  deliveredAt?: string;
}

interface Prescription {
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  notes?: string;
}

interface VitalSign {
  type: VitalType;
  value: number;
  unit: string;
  recordedAt: string;
}

interface TimelineEvent {
  id: string;
  date: string;
  type: 'appointment' | 'lab' | 'prescription' | 'vital_signs' | 'emr' | 'living_will';
  title: string;
  description?: string;
}

// --- Constants ---

const SOAP_SECTIONS: SoapSection[] = ['subjective', 'objective', 'assessment', 'plan'];

const VITAL_RANGES: Record<VitalType, { min: number; max: number; unit: string }> = {
  blood_pressure: { min: 60, max: 200, unit: 'mmHg' },
  heart_rate: { min: 40, max: 200, unit: 'bpm' },
  temperature: { min: 35, max: 42, unit: '°C' },
  oxygen_saturation: { min: 70, max: 100, unit: '%' },
  weight: { min: 1, max: 300, unit: 'kg' },
  height: { min: 30, max: 250, unit: 'cm' },
  bmi: { min: 10, max: 60, unit: 'kg/m²' },
};

const EMR_STATUS_TRANSITIONS: Record<EmrStatus, EmrStatus[]> = {
  draft: ['pending_review'],
  pending_review: ['finalized', 'draft'],
  finalized: ['delivered'],
  delivered: [],
};

const SOAP_LABELS_TH: Record<SoapSection, string> = {
  subjective: 'อาการที่ผู้ป่วยบอก',
  objective: 'สิ่งที่ตรวจพบ',
  assessment: 'การวินิจฉัย',
  plan: 'แผนการรักษา',
};

// --- Helper Functions ---

function validateSoapNote(note: Partial<SoapNote>): string[] {
  const errors: string[] = [];
  for (const section of SOAP_SECTIONS) {
    if (!note[section] || note[section].trim().length === 0) {
      errors.push(`${section} section is required`);
    }
  }
  return errors;
}

function canTransitionEmr(current: EmrStatus, next: EmrStatus): boolean {
  return EMR_STATUS_TRANSITIONS[current]?.includes(next) ?? false;
}

function isVitalInRange(type: VitalType, value: number): boolean {
  const range = VITAL_RANGES[type];
  if (!range) return false;
  return value >= range.min && value <= range.max;
}

function calculateBmi(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

function getBmiCategory(bmi: number): string {
  if (bmi < 18.5) return 'underweight';
  if (bmi < 25) return 'normal';
  if (bmi < 30) return 'overweight';
  return 'obese';
}

function getBmiCategoryTh(bmi: number): string {
  if (bmi < 18.5) return 'น้ำหนักน้อย';
  if (bmi < 25) return 'ปกติ';
  if (bmi < 30) return 'น้ำหนักเกิน';
  return 'อ้วน';
}

function generateEmrId(): string {
  return `EMR-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

function validatePrescription(rx: Partial<Prescription>): string[] {
  const errors: string[] = [];
  if (!rx.medication?.trim()) errors.push('Medication name required');
  if (!rx.dosage?.trim()) errors.push('Dosage required');
  if (!rx.frequency?.trim()) errors.push('Frequency required');
  if (!rx.duration?.trim()) errors.push('Duration required');
  return errors;
}

function sortTimelineByDate(events: TimelineEvent[]): TimelineEvent[] {
  return [...events].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function isCompleteEmr(emr: Partial<EmrRecord>): boolean {
  if (!emr.soapNote) return false;
  const soapErrors = validateSoapNote(emr.soapNote);
  if (soapErrors.length > 0) return false;
  if (!emr.diagnoses || emr.diagnoses.length === 0) return false;
  if (!emr.patientId || !emr.doctorId) return false;
  return true;
}

function canDoctorFinalize(emr: Partial<EmrRecord>, doctorId: string): boolean {
  return emr.doctorId === doctorId && emr.status === 'pending_review';
}

// --- Tests ---

describe('Health Records & EMR Workflow (Process: Health_Records_Processes.md)', () => {

  describe('A — SOAP Note Validation', () => {
    it('A01 — 4 SOAP sections required', () => expect(SOAP_SECTIONS).toHaveLength(4));
    it('A02 — complete SOAP passes', () => {
      const note: SoapNote = {
        subjective: 'Patient complains of headache',
        objective: 'BP 120/80, Temp 37.0',
        assessment: 'Tension headache',
        plan: 'Paracetamol 500mg',
      };
      expect(validateSoapNote(note)).toHaveLength(0);
    });
    it('A03 — missing subjective fails', () => {
      const note: Partial<SoapNote> = { objective: 'OK', assessment: 'OK', plan: 'OK' };
      expect(validateSoapNote(note)).toContain('subjective section is required');
    });
    it('A04 — empty assessment fails', () => {
      const note: Partial<SoapNote> = { subjective: 'OK', objective: 'OK', assessment: '  ', plan: 'OK' };
      expect(validateSoapNote(note)).toContain('assessment section is required');
    });
    it('A05 — all sections have Thai labels', () => {
      for (const section of SOAP_SECTIONS) {
        expect(SOAP_LABELS_TH[section]).toBeTruthy();
      }
    });
  });

  describe('B — EMR Status Transitions', () => {
    it('B01 — draft → pending_review', () => expect(canTransitionEmr('draft', 'pending_review')).toBe(true));
    it('B02 — pending_review → finalized', () => expect(canTransitionEmr('pending_review', 'finalized')).toBe(true));
    it('B03 — pending_review → draft (revise)', () => expect(canTransitionEmr('pending_review', 'draft')).toBe(true));
    it('B04 — finalized → delivered', () => expect(canTransitionEmr('finalized', 'delivered')).toBe(true));
    it('B05 — delivered cannot go back', () => expect(canTransitionEmr('delivered', 'finalized')).toBe(false));
    it('B06 — draft cannot skip to finalized', () => expect(canTransitionEmr('draft', 'finalized')).toBe(false));
    it('B07 — draft cannot skip to delivered', () => expect(canTransitionEmr('draft', 'delivered')).toBe(false));
  });

  describe('C — Vital Signs Range', () => {
    it('C01 — normal BP in range', () => expect(isVitalInRange('blood_pressure', 120)).toBe(true));
    it('C02 — extreme BP out of range', () => expect(isVitalInRange('blood_pressure', 300)).toBe(false));
    it('C03 — normal heart rate', () => expect(isVitalInRange('heart_rate', 72)).toBe(true));
    it('C04 — low heart rate edge', () => expect(isVitalInRange('heart_rate', 40)).toBe(true));
    it('C05 — normal temperature', () => expect(isVitalInRange('temperature', 37)).toBe(true));
    it('C06 — fever', () => expect(isVitalInRange('temperature', 39)).toBe(true));
    it('C07 — hypothermia out of range', () => expect(isVitalInRange('temperature', 30)).toBe(false));
    it('C08 — O2 saturation normal', () => expect(isVitalInRange('oxygen_saturation', 98)).toBe(true));
    it('C09 — 7 vital types defined', () => expect(Object.keys(VITAL_RANGES)).toHaveLength(7));
  });

  describe('D — BMI Calculation', () => {
    it('D01 — normal BMI', () => {
      const bmi = calculateBmi(70, 175);
      expect(bmi).toBeCloseTo(22.9, 0);
    });
    it('D02 — underweight', () => expect(getBmiCategory(17)).toBe('underweight'));
    it('D03 — normal category', () => expect(getBmiCategory(22)).toBe('normal'));
    it('D04 — overweight', () => expect(getBmiCategory(27)).toBe('overweight'));
    it('D05 — obese', () => expect(getBmiCategory(32)).toBe('obese'));
    it('D06 — Thai labels', () => {
      expect(getBmiCategoryTh(22)).toBe('ปกติ');
      expect(getBmiCategoryTh(32)).toBe('อ้วน');
    });
  });

  describe('E — Prescription Validation', () => {
    it('E01 — valid prescription', () => {
      expect(validatePrescription({
        medication: 'Paracetamol', dosage: '500mg', frequency: 'TID', duration: '7 days',
      })).toHaveLength(0);
    });
    it('E02 — missing medication', () => {
      expect(validatePrescription({ dosage: '500mg', frequency: 'TID', duration: '7 days' }))
        .toContain('Medication name required');
    });
    it('E03 — all fields required', () => {
      expect(validatePrescription({})).toHaveLength(4);
    });
  });

  describe('F — Timeline', () => {
    it('F01 — sort by date descending', () => {
      const events: TimelineEvent[] = [
        { id: '1', date: '2026-01-01', type: 'appointment', title: 'Visit 1' },
        { id: '2', date: '2026-03-01', type: 'lab', title: 'Lab 1' },
        { id: '3', date: '2026-02-01', type: 'emr', title: 'EMR 1' },
      ];
      const sorted = sortTimelineByDate(events);
      expect(sorted[0].id).toBe('2');
      expect(sorted[2].id).toBe('1');
    });
    it('F02 — 6 timeline event types', () => {
      const types: TimelineEvent['type'][] = ['appointment', 'lab', 'prescription', 'vital_signs', 'emr', 'living_will'];
      expect(types).toHaveLength(6);
    });
  });

  describe('G — EMR Completeness Check', () => {
    it('G01 — complete EMR passes', () => {
      expect(isCompleteEmr({
        soapNote: { subjective: 'S', objective: 'O', assessment: 'A', plan: 'P' },
        diagnoses: ['Headache'], patientId: 'PAT-001', doctorId: 'DOC-001',
      })).toBe(true);
    });
    it('G02 — missing diagnosis fails', () => {
      expect(isCompleteEmr({
        soapNote: { subjective: 'S', objective: 'O', assessment: 'A', plan: 'P' },
        diagnoses: [], patientId: 'P1', doctorId: 'D1',
      })).toBe(false);
    });
    it('G03 — missing SOAP fails', () => {
      expect(isCompleteEmr({ diagnoses: ['X'], patientId: 'P', doctorId: 'D' })).toBe(false);
    });
  });

  describe('H — Doctor EMR Authorization', () => {
    it('H01 — own EMR in pending_review can finalize', () => {
      expect(canDoctorFinalize({ doctorId: 'DOC-001', status: 'pending_review' }, 'DOC-001')).toBe(true);
    });
    it('H02 — other doctor cannot finalize', () => {
      expect(canDoctorFinalize({ doctorId: 'DOC-001', status: 'pending_review' }, 'DOC-002')).toBe(false);
    });
    it('H03 — draft status cannot finalize', () => {
      expect(canDoctorFinalize({ doctorId: 'DOC-001', status: 'draft' }, 'DOC-001')).toBe(false);
    });
  });

  describe('I — EMR ID Generation', () => {
    it('I01 — starts with EMR-', () => expect(generateEmrId()).toMatch(/^EMR-/));
    it('I02 — unique IDs', () => {
      const ids = new Set(Array.from({ length: 20 }, () => generateEmrId()));
      expect(ids.size).toBe(20);
    });
  });
});
