import { describe, it, expect } from 'vitest';

/**
 * Pure policy checks mirrored from patient/doctor google-auth handlers.
 */
function shouldRejectGoogleSubMismatch(
  storedSub: string | null | undefined,
  incomingSub: string,
): boolean {
  return Boolean(storedSub && storedSub !== incomingSub);
}

describe('Google SSO — GOOGLE_ACCOUNT_MISMATCH policy', () => {
  it('allows first-time link when google_sub is null', () => {
    expect(shouldRejectGoogleSubMismatch(null, 'sub-abc')).toBe(false);
    expect(shouldRejectGoogleSubMismatch(undefined, 'sub-abc')).toBe(false);
  });

  it('allows repeat login with same sub', () => {
    expect(shouldRejectGoogleSubMismatch('sub-abc', 'sub-abc')).toBe(false);
  });

  it('rejects when stored sub differs from incoming sub', () => {
    expect(shouldRejectGoogleSubMismatch('sub-old', 'sub-new')).toBe(true);
  });
});
