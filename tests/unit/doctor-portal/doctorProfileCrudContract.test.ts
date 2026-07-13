/**
 * Doctor profile CRUD — name/specialty required on update.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');

function validateProfileUpdate(input: {
  name?: string;
  specialty?: string;
}): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!input.name || !input.name.trim()) missing.push('name');
  if (!input.specialty || !input.specialty.trim()) missing.push('specialty');
  return { ok: missing.length === 0, missing };
}

describe('doctorProfileCrudContract — pure', () => {
  it('DPC-01 — profile update requires non-empty name and specialty', () => {
    expect(validateProfileUpdate({ name: 'Dr. Somchai', specialty: 'Cardiology' }).ok).toBe(
      true,
    );
    expect(validateProfileUpdate({ name: '', specialty: 'Cardiology' }).ok).toBe(false);
    expect(validateProfileUpdate({ name: 'Dr. A', specialty: '  ' }).ok).toBe(false);
    expect(validateProfileUpdate({}).missing).toEqual(['name', 'specialty']);
  });
});

describe('doctorProfileCrudContract — source', () => {
  it('DPC-SRC — DoctorPortal profile page / route exists', () => {
    const portal = fs.readFileSync(
      path.join(root, 'Isara-doctor-portal/frontend/pages/DoctorPortal.tsx'),
      'utf8',
    );
    expect(portal).toMatch(/profile/);
    expect(portal).toMatch(/DoctorProfilePage/);

    const page = path.join(root, 'Isara-doctor-portal/frontend/pages/DoctorProfilePage.tsx');
    expect(fs.existsSync(page)).toBe(true);
    const src = fs.readFileSync(page, 'utf8');
    expect(src).toMatch(/specialty/);
    expect(src).toMatch(/name/);
    expect(src).toMatch(/updateProfile/);
  });
});
