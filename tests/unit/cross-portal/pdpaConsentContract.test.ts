/**
 * PDPA consent contract — shared helper used by middleware and /api/pdpa/check
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');

describe('PDPA consent contract', () => {
  it('PDPA-01 — shared helper accepts granted and active status', () => {
    const helper = fs.readFileSync(
      path.join(root, 'issara-doctor/backend/lib/pdpaConsent.cjs'),
      'utf8',
    );
    expect(helper).toMatch(/status IN \('active', 'granted'\)/);
    expect(helper).toMatch(/medical_record_access/);
    expect(helper).toMatch(/revoked_at IS NULL/);
  });

  it('PDPA-02 — mainApiServer uses shared resolveMedicalRecordConsent', () => {
    const server = fs.readFileSync(
      path.join(root, 'issara-doctor/backend/mainApiServer.cjs'),
      'utf8',
    );
    expect(server).toMatch(/require\('\.\/lib\/pdpaConsent\.cjs'\)/);
    expect(server).toMatch(/const pool = PostgresDataService\.pool/);
    expect(server).toMatch(/resolveMedicalRecordConsent\(pool, doc\.patient_id, doctorId\)/);
    expect(server).toMatch(/const doctorId = req\.user\?\.id/);
  });
});
