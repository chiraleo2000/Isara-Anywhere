/**
 * PHR CRUD validators — vitals / medications / allergies.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');

function isNumeric(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return false;
  return Number.isFinite(Number(value));
}

function validateVitalSigns(input: { bp?: unknown; hr?: unknown }): boolean {
  return isNumeric(input.bp) && isNumeric(input.hr);
}

function validateMedication(input: { name?: unknown }): boolean {
  return typeof input.name === 'string' && input.name.trim().length > 0;
}

function validateAllergy(input: { substance?: unknown }): boolean {
  return typeof input.substance === 'string' && input.substance.trim().length > 0;
}

describe('phrCrudContract — pure validators', () => {
  it('PHR-CRUD-01 — vital signs require numeric bp and hr', () => {
    expect(validateVitalSigns({ bp: 120, hr: 72 })).toBe(true);
    expect(validateVitalSigns({ bp: '130/80', hr: 80 })).toBe(false);
    expect(validateVitalSigns({ bp: 120, hr: 'abc' })).toBe(false);
    expect(validateVitalSigns({ bp: '', hr: 70 })).toBe(false);
    expect(validateVitalSigns({ bp: 118 })).toBe(false);
  });

  it('PHR-CRUD-02 — medication requires name', () => {
    expect(validateMedication({ name: 'Metformin' })).toBe(true);
    expect(validateMedication({ name: '  ' })).toBe(false);
    expect(validateMedication({})).toBe(false);
  });

  it('PHR-CRUD-03 — allergy requires substance', () => {
    expect(validateAllergy({ substance: 'Penicillin' })).toBe(true);
    expect(validateAllergy({ substance: '' })).toBe(false);
    expect(validateAllergy({})).toBe(false);
  });
});

describe('phrCrudContract — source', () => {
  it('PHR-CRUD-SRC — phr routes mention vitals / medications / allergies', () => {
    const phr = fs.readFileSync(
      path.join(root, 'Isara-patient-portal/backend/routes/phr.ts'),
      'utf8',
    );
    expect(phr).toMatch(/vitals/);
    expect(phr).toMatch(/medications/);
    expect(phr).toMatch(/allergies/);
    expect(phr).toMatch(/router\.(get|post).*vitals|\/vitals/);
    expect(phr).toMatch(/router\.(get|post).*medications|\/medications/);
    expect(phr).toMatch(/router\.(get|post).*allergies|\/allergies/);
  });
});
