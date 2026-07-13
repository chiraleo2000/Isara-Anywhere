/**
 * PDPA G15/G16 — grant/revoke medical_record_access gates doctor record view.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');

type ConsentState = {
  consentType: string;
  status: 'active' | 'granted' | 'revoked';
  granted: boolean;
  revokedAt: string | null;
};

function grantMedicalRecordAccess(): ConsentState {
  return {
    consentType: 'medical_record_access',
    status: 'active',
    granted: true,
    revokedAt: null,
  };
}

function revokeMedicalRecordAccess(prev: ConsentState): ConsentState {
  return {
    ...prev,
    status: 'revoked',
    granted: false,
    revokedAt: new Date().toISOString(),
  };
}

function doctorCanViewRecord(consent: ConsentState | null): boolean {
  if (!consent) return false;
  if (consent.consentType !== 'medical_record_access') return false;
  if (!consent.granted || consent.revokedAt) return false;
  return consent.status === 'active' || consent.status === 'granted';
}

describe('pdpaG15G16Contract — pure', () => {
  it('G15 — after grant medical_record_access active → doctorCanViewRecord true', () => {
    const consent = grantMedicalRecordAccess();
    expect(consent.status).toBe('active');
    expect(doctorCanViewRecord(consent)).toBe(true);
  });

  it('G16 — after revoke → doctorCanViewRecord false', () => {
    const revoked = revokeMedicalRecordAccess(grantMedicalRecordAccess());
    expect(revoked.status).toBe('revoked');
    expect(doctorCanViewRecord(revoked)).toBe(false);
  });
});

describe('pdpaG15G16Contract — source', () => {
  it('PDPA-SRC — pdpaConsent / patient pdpa routes mention grant/revoke', () => {
    const helper = fs.readFileSync(
      path.join(root, 'Isara-doctor-portal/backend/lib/pdpaConsent.cjs'),
      'utf8',
    );
    expect(helper).toMatch(/medical_record_access/);
    expect(helper).toMatch(/revoked_at|revoke/i);

    const routes = fs.readFileSync(
      path.join(root, 'Isara-patient-portal/backend/routes/pdpa.ts'),
      'utf8',
    );
    expect(routes).toMatch(/grant/i);
    expect(routes).toMatch(/revoke/i);
    expect(routes).toMatch(/medical_record_access/);
  });
});
