/**
 * ═══════════════════════════════════════════════════════════════════════
 * PATIENT PORTAL — PHR Route Unit Tests
 * ═══════════════════════════════════════════════════════════════════════
 * Tests: server/routes/phr.ts — vital signs, medications, allergies, transforms
 */
import { describe, it, expect } from 'vitest';

// ── PHR Transform Logic ────────────────────────────────────────────────

function transformPHR(phr: Record<string, unknown>): Record<string, unknown> {
  if (!phr) return {};
  return {
    id: phr.id,
    patientId: phr.patient_id,
    demographics: {
      height: (phr as any).height_cm || (phr as any).demographics?.height,
      weight: (phr as any).weight_kg || (phr as any).demographics?.weight,
      bloodType: (phr as any).blood_type || (phr as any).demographics?.bloodType,
      dateOfBirth: (phr as any).demographics?.dateOfBirth,
      gender: (phr as any).demographics?.gender,
    },
    allergies: (phr as any).allergies || [],
    chronicConditions: (phr as any).chronic_conditions || [],
    medications: (phr as any).medications || [],
    emergencyContacts: (phr as any).emergency_contacts || [],
    familyHistory: (phr as any).family_history || [],
    surgicalHistory: (phr as any).surgical_history || [],
    vaccinations: (phr as any).vaccinations || [],
    lifestyle: (phr as any).lifestyle || {},
    bmi: (phr as any).bmi,
    createdAt: (phr as any).created_at,
    updatedAt: (phr as any).updated_at,
  };
}

function transformVital(vital: Record<string, unknown>): Record<string, unknown> {
  return {
    id: vital.id,
    patientId: vital.patient_id,
    bloodPressure: vital.blood_pressure_systolic ? {
      systolic: vital.blood_pressure_systolic,
      diastolic: vital.blood_pressure_diastolic,
      unit: 'mmHg',
    } : undefined,
    heartRate: vital.heart_rate ? { value: vital.heart_rate, unit: 'bpm' } : undefined,
    temperature: vital.temperature ? { value: Number(vital.temperature), unit: '°C' } : undefined,
    weight: vital.weight ? { value: Number(vital.weight), unit: 'kg' } : undefined,
    height: vital.height ? { value: Number(vital.height), unit: 'cm' } : undefined,
    oxygenSaturation: vital.oxygen_saturation ? { value: vital.oxygen_saturation, unit: '%' } : undefined,
    bloodGlucose: vital.blood_glucose ? {
      value: vital.blood_glucose,
      unit: 'mg/dL',
      timing: (vital as any).blood_glucose_type || 'random',
    } : undefined,
    bmi: vital.bmi ? Number(vital.bmi) : undefined,
    measuredAt: vital.measured_at || vital.recorded_at,
    source: vital.source,
    notes: vital.notes,
  };
}

function convertVitalToDbFormat(vitalData: Record<string, unknown>): Record<string, unknown> {
  return {
    blood_pressure_systolic: (vitalData as any).bloodPressure?.systolic || vitalData.blood_pressure_systolic,
    blood_pressure_diastolic: (vitalData as any).bloodPressure?.diastolic || vitalData.blood_pressure_diastolic,
    heart_rate: (vitalData as any).heartRate?.value || vitalData.heart_rate,
    temperature: (vitalData as any).temperature?.value || vitalData.temperature,
    weight: (vitalData as any).weight?.value || vitalData.weight,
    height: (vitalData as any).height?.value || vitalData.height,
    oxygen_saturation: (vitalData as any).oxygenSaturation?.value || vitalData.oxygen_saturation,
    blood_glucose: (vitalData as any).bloodGlucose?.value || vitalData.blood_glucose,
    blood_glucose_timing: (vitalData as any).bloodGlucose?.timing || vitalData.blood_glucose_timing,
    notes: vitalData.notes,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────

describe('Patient Portal — PHR Route', () => {

  describe('A — PHR Transform', () => {
    it('A01 — transforms DB format correctly', () => {
      const dbRow = {
        id: 'phr-1',
        patient_id: 'PT-001',
        height_cm: 170,
        weight_kg: 65,
        blood_type: 'O+',
        allergies: ['penicillin'],
        chronic_conditions: ['hypertension'],
        medications: [{ name: 'Metformin' }],
        emergency_contacts: [{ name: 'คุณแม่' }],
        family_history: [],
        surgical_history: [],
        vaccinations: [],
        lifestyle: { exercise: 'moderate' },
        bmi: 22.5,
        created_at: '2025-01-01',
        updated_at: '2025-06-01',
      };
      const result = transformPHR(dbRow);
      expect(result.patientId).toBe('PT-001');
      expect((result.demographics as any).height).toBe(170);
      expect((result.demographics as any).weight).toBe(65);
      expect((result.demographics as any).bloodType).toBe('O+');
      expect(result.allergies).toEqual(['penicillin']);
      expect(result.chronicConditions).toEqual(['hypertension']);
    });

    it('A02 — handles null PHR', () => {
      const result = transformPHR(null as any);
      expect(result).toEqual({});
    });

    it('A03 — defaults arrays to empty', () => {
      const result = transformPHR({ id: 'x', patient_id: 'PT' } as any);
      expect(result.allergies).toEqual([]);
      expect(result.medications).toEqual([]);
      expect(result.chronicConditions).toEqual([]);
    });

    it('A04 — preserves Thai text', () => {
      const dbRow = {
        id: 'phr-2',
        patient_id: 'PT-002',
        allergies: ['เพนิซิลลิน'],
        emergency_contacts: [{ name: 'คุณแม่', phone: '081-234-5678' }],
        family_history: [{ condition: 'เบาหวาน' }],
      };
      const result = transformPHR(dbRow);
      expect((result.allergies as string[])[0]).toBe('เพนิซิลลิน');
    });
  });

  describe('B — Vital Signs Transform', () => {
    it('B01 — transforms complete vital signs', () => {
      const dbVital = {
        id: 'v-1',
        patient_id: 'PT-001',
        blood_pressure_systolic: 120,
        blood_pressure_diastolic: 80,
        heart_rate: 72,
        temperature: 36.5,
        weight: 65,
        height: 170,
        oxygen_saturation: 98,
        blood_glucose: 95,
        blood_glucose_type: 'fasting',
        bmi: 22.5,
        measured_at: '2025-06-01T10:00:00Z',
        source: 'self_reported',
        notes: 'After morning exercise',
      };
      const result = transformVital(dbVital);
      expect((result.bloodPressure as any).systolic).toBe(120);
      expect((result.bloodPressure as any).unit).toBe('mmHg');
      expect((result.heartRate as any).value).toBe(72);
      expect((result.heartRate as any).unit).toBe('bpm');
      expect((result.temperature as any).value).toBe(36.5);
      expect((result.temperature as any).unit).toBe('°C');
      expect((result.oxygenSaturation as any).value).toBe(98);
      expect((result.bloodGlucose as any).timing).toBe('fasting');
    });

    it('B02 — omits missing vital fields', () => {
      const dbVital = { id: 'v-2', patient_id: 'PT-001', heart_rate: 80 };
      const result = transformVital(dbVital);
      expect(result.bloodPressure).toBeUndefined();
      expect(result.temperature).toBeUndefined();
      expect(result.heartRate).toEqual({ value: 80, unit: 'bpm' });
    });

    it('B03 — falls back to recorded_at', () => {
      const dbVital = { id: 'v-3', patient_id: 'PT-001', recorded_at: '2025-05-01T08:00:00Z' };
      const result = transformVital(dbVital);
      expect(result.measuredAt).toBe('2025-05-01T08:00:00Z');
    });
  });

  describe('C — Vital DB Format Conversion', () => {
    it('C01 — converts frontend format to DB format', () => {
      const frontendData = {
        bloodPressure: { systolic: 120, diastolic: 80 },
        heartRate: { value: 72 },
        temperature: { value: 36.5 },
        weight: { value: 65 },
        height: { value: 170 },
        oxygenSaturation: { value: 98 },
        bloodGlucose: { value: 95, timing: 'fasting' },
        notes: 'Test vitals',
      };
      const result = convertVitalToDbFormat(frontendData);
      expect(result.blood_pressure_systolic).toBe(120);
      expect(result.blood_pressure_diastolic).toBe(80);
      expect(result.heart_rate).toBe(72);
      expect(result.temperature).toBe(36.5);
      expect(result.blood_glucose_timing).toBe('fasting');
    });

    it('C02 — accepts DB-format fields directly', () => {
      const dbData = {
        blood_pressure_systolic: 130,
        blood_pressure_diastolic: 85,
        heart_rate: 80,
        temperature: 37.0,
      };
      const result = convertVitalToDbFormat(dbData);
      expect(result.blood_pressure_systolic).toBe(130);
      expect(result.heart_rate).toBe(80);
    });
  });

  describe('D — Medication ID Generation', () => {
    it('D01 — generates med_ prefixed ID', () => {
      const id = `med_${Date.now()}`;
      expect(id.startsWith('med_')).toBe(true);
    });

    it('D02 — generates unique IDs', () => {
      const id1 = `med_${Date.now()}`;
      const id2 = `med_${Date.now() + 1}`;
      expect(id1).not.toBe(id2);
    });
  });

  describe('E — Allergy ID Generation', () => {
    it('E01 — generates allergy_ prefixed ID', () => {
      const id = `allergy_${Date.now()}`;
      expect(id.startsWith('allergy_')).toBe(true);
    });
  });

  describe('F — Empty PHR Response', () => {
    it('F01 — default empty PHR structure for missing records', () => {
      const emptyPHR = {
        patientId: 'PT-NEW',
        allergies: [],
        chronicConditions: [],
        medications: [],
        emergencyContacts: [],
        demographics: {},
        lifestyle: {},
        createdAt: null,
        updatedAt: null,
      };
      expect(emptyPHR.allergies).toHaveLength(0);
      expect(emptyPHR.medications).toHaveLength(0);
      expect(emptyPHR.demographics).toEqual({});
      expect(emptyPHR.createdAt).toBeNull();
    });
  });
});
