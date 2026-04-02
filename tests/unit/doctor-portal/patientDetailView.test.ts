/**
 * ═══════════════════════════════════════════════════════════════════════
 * Patient Detail View Logic Tests (Doctor Portal)
 * Tests: Data rendering, vitals formatting, history aggregation
 * ═══════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from 'vitest';

// --- Types ---
interface PatientSummary {
  id: string;
  name: string;
  age: number;
  gender: string;
  bloodType?: string;
  allergies: string[];
  chronicConditions: string[];
  lastVisit?: string;
}

interface VitalSign {
  type: 'blood_pressure' | 'heart_rate' | 'temperature' | 'weight' | 'oxygen';
  value: number;
  unit: string;
  measuredAt: string;
  status: 'normal' | 'warning' | 'critical';
}

// --- Functions ---

function calculateAge(birthDate: string): number {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

const VITAL_RANGES: Record<string, { critical: [number, number]; warning: [number, number] }> = {
  heart_rate:     { critical: [40, 150],  warning: [60, 100] },
  temperature:    { critical: [35, 40],   warning: [36, 37.5] },
  oxygen:         { critical: [90, Infinity], warning: [95, Infinity] },
  blood_pressure: { critical: [70, 180],  warning: [90, 140] },
};

function classifyVitalStatus(type: string, value: number): 'normal' | 'warning' | 'critical' {
  const range = VITAL_RANGES[type];
  if (!range) return 'normal';
  if (type === 'oxygen') {
    if (value < range.critical[0]) return 'critical';
    if (value < range.warning[0]) return 'warning';
    return 'normal';
  }
  if (value < range.critical[0] || value > range.critical[1]) return 'critical';
  if (value < range.warning[0] || value > range.warning[1]) return 'warning';
  return 'normal';
}

function formatVitalDisplay(vital: VitalSign): string {
  return `${vital.value} ${vital.unit}`;
}

function getLatestVitals(vitals: VitalSign[]): Map<string, VitalSign> {
  const latest = new Map<string, VitalSign>();
  for (const v of vitals) {
    const existing = latest.get(v.type);
    if (!existing || new Date(v.measuredAt) > new Date(existing.measuredAt)) {
      latest.set(v.type, v);
    }
  }
  return latest;
}

function getAllergyWarningLevel(allergies: string[]): 'none' | 'low' | 'high' {
  if (allergies.length === 0) return 'none';
  const serious = new Set(['penicillin', 'aspirin', 'sulfa', 'latex', 'morphine']);
  const hasSerious = allergies.some(a => serious.has(a.toLowerCase()));
  return hasSerious ? 'high' : 'low';
}

function formatPatientSummary(patient: PatientSummary): string {
  const parts = [
    `${patient.name} (${patient.age} ปี, ${patient.gender})`,
    patient.bloodType ? `หมู่เลือด: ${patient.bloodType}` : '',
    patient.allergies.length ? `แพ้ยา: ${patient.allergies.join(', ')}` : 'ไม่มีอาการแพ้ยา',
  ];
  return parts.filter(Boolean).join(' | ');
}

// --- Tests ---

describe('Patient Detail — Age Calculation', () => {
  it('PD01 — correct age from birth date', () => {
    const age = calculateAge('1990-06-15');
    expect(age).toBeGreaterThan(30);
    expect(age).toBeLessThan(40);
  });

  it('PD02 — age is non-negative', () => {
    expect(calculateAge('2020-01-01')).toBeGreaterThanOrEqual(0);
  });
});

describe('Patient Detail — Vital Classification', () => {
  it('PD03 — normal heart rate 72', () => {
    expect(classifyVitalStatus('heart_rate', 72)).toBe('normal');
  });

  it('PD04 — warning heart rate 55', () => {
    expect(classifyVitalStatus('heart_rate', 55)).toBe('warning');
  });

  it('PD05 — critical heart rate 160', () => {
    expect(classifyVitalStatus('heart_rate', 160)).toBe('critical');
  });

  it('PD06 — normal temperature 36.5', () => {
    expect(classifyVitalStatus('temperature', 36.5)).toBe('normal');
  });

  it('PD07 — warning temperature 38', () => {
    expect(classifyVitalStatus('temperature', 38)).toBe('warning');
  });

  it('PD08 — critical oxygen 85', () => {
    expect(classifyVitalStatus('oxygen', 85)).toBe('critical');
  });

  it('PD09 — normal oxygen 98', () => {
    expect(classifyVitalStatus('oxygen', 98)).toBe('normal');
  });

  it('PD10 — critical blood pressure 200', () => {
    expect(classifyVitalStatus('blood_pressure', 200)).toBe('critical');
  });
});

describe('Patient Detail — Vital Display', () => {
  it('PD11 — format vital with unit', () => {
    const v: VitalSign = { type: 'heart_rate', value: 72, unit: 'bpm', measuredAt: '2026-03-15T10:00:00Z', status: 'normal' };
    expect(formatVitalDisplay(v)).toBe('72 bpm');
  });
});

describe('Patient Detail — Latest Vitals', () => {
  it('PD12 — picks most recent per type', () => {
    const vitals: VitalSign[] = [
      { type: 'heart_rate', value: 70, unit: 'bpm', measuredAt: '2026-03-14T10:00:00Z', status: 'normal' },
      { type: 'heart_rate', value: 75, unit: 'bpm', measuredAt: '2026-03-15T10:00:00Z', status: 'normal' },
      { type: 'temperature', value: 36.8, unit: '°C', measuredAt: '2026-03-15T08:00:00Z', status: 'normal' },
    ];
    const latest = getLatestVitals(vitals);
    expect(latest.get('heart_rate')?.value).toBe(75);
    expect(latest.size).toBe(2);
  });
});

describe('Patient Detail — Allergy Warning', () => {
  it('PD13 — no allergies = none', () => {
    expect(getAllergyWarningLevel([])).toBe('none');
  });

  it('PD14 — non-serious allergy = low', () => {
    expect(getAllergyWarningLevel(['pollen'])).toBe('low');
  });

  it('PD15 — penicillin allergy = high', () => {
    expect(getAllergyWarningLevel(['Penicillin'])).toBe('high');
  });
});

describe('Patient Detail — Summary Formatting', () => {
  it('PD16 — full summary with Thai labels', () => {
    const patient: PatientSummary = {
      id: '1', name: 'สมชาย', age: 45, gender: 'ชาย',
      bloodType: 'A+', allergies: ['Penicillin'], chronicConditions: [],
    };
    const summary = formatPatientSummary(patient);
    expect(summary).toContain('สมชาย');
    expect(summary).toContain('45 ปี');
    expect(summary).toContain('หมู่เลือด: A+');
    expect(summary).toContain('Penicillin');
  });

  it('PD17 — no allergies shows ไม่มีอาการแพ้ยา', () => {
    const patient: PatientSummary = {
      id: '2', name: 'Test', age: 30, gender: 'F',
      bloodType: undefined, allergies: [], chronicConditions: [],
    };
    expect(formatPatientSummary(patient)).toContain('ไม่มีอาการแพ้ยา');
  });
});
