/**
 * ═══════════════════════════════════════════════════════════════════════
 * IZARA TELEMEDICINE — SHARED PHR TYPES UNIT TESTS
 * ═══════════════════════════════════════════════════════════════════════
 * Tests: createEmptyPHR, createEmptyLivingWill, convertLivingWillToDoctorView,
 *        convertPHRToDoctorView — pure data transform functions
 * Source: Isara-patient-portal/frontend/types/sharedPHRTypes.ts
 * ═══════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from 'vitest';
import {
  createEmptyPHR,
  convertPHRToDoctorView,
} from '../../../Isara-doctor-portal/frontend/types/sharedPHRTypes';

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
