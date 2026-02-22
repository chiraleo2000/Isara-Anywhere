/**
 * ═══════════════════════════════════════════════════════════════════════
 * IZARA TELEMEDICINE — SHARED PHR TYPES UNIT TESTS
 * ═══════════════════════════════════════════════════════════════════════
 * Tests: createEmptyPHR, createEmptyLivingWill, convertLivingWillToDoctorView,
 *        convertPHRToDoctorView — pure data transform functions
 * Source: Isara-patient-portal/src/types/sharedPHRTypes.ts
 * ═══════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from 'vitest';
import {
  createEmptyPHR,
  createEmptyLivingWill,
  convertLivingWillToDoctorView,
  convertPHRToDoctorView,
} from '../../../Isara-patient-portal/src/types/sharedPHRTypes';

// ─────────────────────────────────────────────
// A. createEmptyPHR
// ─────────────────────────────────────────────

describe('SharedPHRTypes — createEmptyPHR', () => {
  it('A01 — creates PHR with correct patientId', () => {
    const phr = createEmptyPHR('P001', 'Test Patient');
    expect(phr.patientId).toBe('P001');
  });

  it('A02 — creates PHR with correct name in demographics', () => {
    const phr = createEmptyPHR('P001', 'สมชาย มั่นคง');
    expect(phr.demographics.name).toBe('สมชาย มั่นคง');
  });

  it('A03 — creates PHR with empty arrays', () => {
    const phr = createEmptyPHR('P001', 'Test');
    expect(phr.vitalSignsHistory).toEqual([]);
    expect(phr.allergies).toEqual([]);
    expect(phr.chronicConditions).toEqual([]);
    expect(phr.currentMedications).toEqual([]);
    expect(phr.vaccinations).toEqual([]);
    expect(phr.documents).toEqual([]);
    expect(phr.emergencyContacts).toEqual([]);
  });

  it('A04 — creates PHR with version 2.0.0', () => {
    const phr = createEmptyPHR('P001', 'Test');
    expect(phr.version).toBe('2.0.0');
  });

  it('A05 — creates PHR with valid timestamps', () => {
    const before = new Date().toISOString();
    const phr = createEmptyPHR('P001', 'Test');
    const after = new Date().toISOString();
    expect(phr.createdAt >= before).toBe(true);
    expect(phr.createdAt <= after).toBe(true);
  });

  it('A06 — creates PHR with default lifestyle values', () => {
    const phr = createEmptyPHR('P001', 'Test');
    expect(phr.lifestyle).toBeDefined();
    expect(phr.lifestyle.smokingStatus).toBe('unknown');
    expect(phr.lifestyle.alcoholConsumption).toBe('unknown');
  });

  it('A07 — creates unique PHR IDs', () => {
    const phr1 = createEmptyPHR('P001', 'Test 1');
    const phr2 = createEmptyPHR('P002', 'Test 2');
    expect(phr1.id).not.toBe(phr2.id);
  });

  it('A08 — lastModifiedBy is patient', () => {
    const phr = createEmptyPHR('P001', 'Test');
    expect(phr.lastModifiedBy).toBe('patient');
  });
});

// ─────────────────────────────────────────────
// B. createEmptyLivingWill
// ─────────────────────────────────────────────

describe('SharedPHRTypes — createEmptyLivingWill', () => {
  it('B01 — creates living will with correct patientId', () => {
    const lw = createEmptyLivingWill('P001');
    expect(lw.patientId).toBe('P001');
  });

  it('B02 — creates living will with draft status', () => {
    const lw = createEmptyLivingWill('P001');
    expect(lw.status).toBe('draft');
  });

  it('B03 — creates living will with 7 treatment types', () => {
    const lw = createEmptyLivingWill('P001');
    const treatments = lw.treatments;
    expect(treatments.cpr).toBeDefined();
    expect(treatments.mechanicalVentilation).toBeDefined();
    expect(treatments.artificialNutrition).toBeDefined();
    expect(treatments.dialysis).toBeDefined();
    expect(treatments.antibiotics).toBeDefined();
    expect(treatments.painManagement).toBeDefined();
    expect(treatments.organDonation).toBeDefined();
  });

  it('B04 — antibiotics and painManagement default to "accept"', () => {
    const lw = createEmptyLivingWill('P001');
    expect(lw.treatments.antibiotics.preference).toBe('accept');
    expect(lw.treatments.painManagement.preference).toBe('accept');
  });

  it('B05 — CPR defaults to "conditional"', () => {
    const lw = createEmptyLivingWill('P001');
    expect(lw.treatments.cpr.preference).toBe('conditional');
  });

  it('B06 — PDPA consent defaults to not shared', () => {
    const lw = createEmptyLivingWill('P001');
    expect(lw.pdpaConsent.isSharedWithDoctors).toBe(false);
    expect(lw.pdpaConsent.shareScope).toBe('none');
    expect(lw.pdpaConsent.shareWithAdmin).toBe(false);
  });

  it('B07 — PDPA consent allows withdrawal', () => {
    const lw = createEmptyLivingWill('P001');
    expect(lw.pdpaConsent.canWithdraw).toBe(true);
  });

  it('B08 — creates with empty representatives', () => {
    const lw = createEmptyLivingWill('P001');
    expect(lw.representatives).toEqual([]);
  });

  it('B09 — creates with audit log entry', () => {
    const lw = createEmptyLivingWill('P001');
    expect(lw.auditLog).toHaveLength(1);
    expect(lw.auditLog[0].action).toBe('created');
    expect(lw.auditLog[0].performedBy).toBe('patient');
  });

  it('B10 — signature method is digital', () => {
    const lw = createEmptyLivingWill('P001');
    expect(lw.signature.signatureMethod).toBe('digital');
  });
});

// ─────────────────────────────────────────────
// C. convertLivingWillToDoctorView
// ─────────────────────────────────────────────

describe('SharedPHRTypes — convertLivingWillToDoctorView', () => {
  it('C01 — returns null when PDPA consent is not shared', () => {
    const lw = createEmptyLivingWill('P001');
    lw.pdpaConsent.isSharedWithDoctors = false;
    const result = convertLivingWillToDoctorView(lw, 'Test Patient');
    expect(result).toBeNull();
  });

  it('C02 — returns doctor view when PDPA consent is shared', () => {
    const lw = createEmptyLivingWill('P001');
    lw.pdpaConsent.isSharedWithDoctors = true;
    const result = convertLivingWillToDoctorView(lw, 'Test Patient');
    expect(result).not.toBeNull();
    expect(result!.patientName).toBe('Test Patient');
    expect(result!.patientId).toBe('P001');
  });

  it('C03 — doctor view contains treatment preferences', () => {
    const lw = createEmptyLivingWill('P001');
    lw.pdpaConsent.isSharedWithDoctors = true;
    const result = convertLivingWillToDoctorView(lw, 'Test Patient');
    expect(result!.treatments).toBeDefined();
    expect(result!.treatments.cpr).toBeDefined();
  });

  it('C04 — doctor view has isSharedByPatient = true', () => {
    const lw = createEmptyLivingWill('P001');
    lw.pdpaConsent.isSharedWithDoctors = true;
    const result = convertLivingWillToDoctorView(lw, 'Test');
    expect(result!.isSharedByPatient).toBe(true);
  });

  it('C05 — doctor view omits sensitive representative details when no main rep', () => {
    const lw = createEmptyLivingWill('P001');
    lw.pdpaConsent.isSharedWithDoctors = true;
    const result = convertLivingWillToDoctorView(lw, 'Test');
    expect(result!.mainRepresentative).toBeUndefined();
  });
});

// ─────────────────────────────────────────────
// D. convertPHRToDoctorView
// ─────────────────────────────────────────────

describe('SharedPHRTypes — convertPHRToDoctorView', () => {
  it('D01 — converts PHR to doctor view with basic fields', () => {
    const phr = createEmptyPHR('P001', 'สมชาย');
    const view = convertPHRToDoctorView(phr);
    expect(view.patientId).toBe('P001');
    expect(view.demographics.name).toBe('สมชาย');
  });

  it('D02 — empty PHR has empty arrays in doctor view', () => {
    const phr = createEmptyPHR('P001', 'Test');
    const view = convertPHRToDoctorView(phr);
    expect(view.allergies).toEqual([]);
    expect(view.chronicConditions).toEqual([]);
    expect(view.currentMedications).toEqual([]);
    expect(view.vitalSigns).toEqual([]);
    expect(view.vaccinations).toEqual([]);
  });

  it('D03 — doctor view includes lifestyle data', () => {
    const phr = createEmptyPHR('P001', 'Test');
    const view = convertPHRToDoctorView(phr);
    expect(view.lifestyle).toBeDefined();
    expect(view.lifestyle.smoking).toBe(false); // smokingStatus: 'unknown' → not 'current' → false
    expect(view.lifestyle.alcohol).toBe(true); // alcoholConsumption: 'unknown' !== 'never' → true
  });

  it('D04 — limits vital signs to last 10', () => {
    const phr = createEmptyPHR('P001', 'Test');
    // Add 15 vital sign entries
    for (let i = 0; i < 15; i++) {
      phr.vitalSignsHistory.push({
        measuredAt: new Date(2026, 0, i + 1).toISOString(),
        bloodPressure: { systolic: 120 + i, diastolic: 80 + i, unit: 'mmHg' },
      } as any);
    }
    const view = convertPHRToDoctorView(phr);
    expect(view.vitalSigns.length).toBeLessThanOrEqual(10);
  });

  it('D05 — filters only active medications', () => {
    const phr = createEmptyPHR('P001', 'Test');
    phr.currentMedications = [
      { name: 'Aspirin', dosage: '100mg', frequency: 'daily', status: 'active', startDate: '2026-01-01' } as any,
      { name: 'Omeprazole', dosage: '20mg', frequency: 'daily', status: 'discontinued', startDate: '2025-01-01' } as any,
    ];
    const view = convertPHRToDoctorView(phr);
    expect(view.currentMedications).toHaveLength(1);
    expect(view.currentMedications[0].name).toBe('Aspirin');
  });
});
