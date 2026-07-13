/**
 * MITL validate — patient-visible summary only after validation; badge selection.
 */
import { describe, it, expect } from 'vitest';

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
