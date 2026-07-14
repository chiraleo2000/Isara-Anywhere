/**
 * MITL validate — patient-visible summary only after validation; badge selection.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');

function patientCanSeeSummary(opts: {
  requiresValidation: boolean;
  validated: boolean;
  rejected: boolean;
}): boolean {
  if (opts.rejected) return false;
  if (opts.requiresValidation) return opts.validated === true;
  return opts.validated === true && !opts.rejected;
}

function summaryBadge(opts: { skipLiveGemini: boolean; hasStructured: boolean }): string {
  if (opts.skipLiveGemini || !opts.hasStructured) return 'summary-degraded-badge';
  return 'summary-structured';
}

function patientCanSeeMeetingRecording(opts: {
  readyForPatient: boolean;
  hasRecordingUrl: boolean;
}): boolean {
  return opts.readyForPatient === true && opts.hasRecordingUrl === true;
}

describe('mitlValidateContract — patient visibility', () => {
  it('MITL-01 — patientCanSeeSummary only when validated true and not rejected', () => {
    expect(
      patientCanSeeSummary({ requiresValidation: true, validated: true, rejected: false }),
    ).toBe(true);
    expect(
      patientCanSeeSummary({ requiresValidation: true, validated: false, rejected: false }),
    ).toBe(false);
    expect(
      patientCanSeeSummary({ requiresValidation: true, validated: true, rejected: true }),
    ).toBe(false);
    expect(
      patientCanSeeSummary({ requiresValidation: false, validated: true, rejected: false }),
    ).toBe(true);
  });

  it('MITL-01b — reject clears patient unlock even after prior validate', () => {
    expect(
      patientCanSeeSummary({ requiresValidation: true, validated: true, rejected: false }),
    ).toBe(true);
    expect(
      patientCanSeeSummary({ requiresValidation: true, validated: true, rejected: true }),
    ).toBe(false);
  });
});

describe('mitlValidateContract — summary badge', () => {
  it('MITL-02 — summaryBadge returns summary-degraded-badge or summary-structured', () => {
    expect(summaryBadge({ skipLiveGemini: true, hasStructured: true })).toBe(
      'summary-degraded-badge',
    );
    expect(summaryBadge({ skipLiveGemini: false, hasStructured: false })).toBe(
      'summary-degraded-badge',
    );
    expect(summaryBadge({ skipLiveGemini: false, hasStructured: true })).toBe(
      'summary-structured',
    );
  });
});

describe('mitlValidateContract — recording unlock', () => {
  it('MITL-03 — recording visible only when ready_for_patient', () => {
    expect(
      patientCanSeeMeetingRecording({ readyForPatient: false, hasRecordingUrl: true }),
    ).toBe(false);
    expect(
      patientCanSeeMeetingRecording({ readyForPatient: true, hasRecordingUrl: true }),
    ).toBe(true);
    expect(
      patientCanSeeMeetingRecording({ readyForPatient: true, hasRecordingUrl: false }),
    ).toBe(false);
  });
});

describe('mitlValidateContract — source', () => {
  it('MITL-SRC — validate publishes emr_report and sets ready_for_patient', () => {
    const src = fs.readFileSync(
      path.join(root, 'Izara-jitsi-server/backend/index.js'),
      'utf8',
    );
    const validateIdx = src.indexOf("app.post('/api/meetings/:id/validate'");
    expect(validateIdx).toBeGreaterThan(-1);
    expect(src.indexOf("VALUES ($1, 'emr_report'", validateIdx)).toBeGreaterThan(validateIdx);
    expect(src.indexOf('ready_for_patient', validateIdx)).toBeGreaterThan(validateIdx);
    expect(src).toMatch(/fromValidate:\s*true/);
  });
});
