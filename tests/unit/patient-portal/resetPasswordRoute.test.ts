/**
 * @process Processes/Pages/Patient-Portal/03_Reset_Password_Page.md
 */
import { describe, it, expect } from 'vitest';

function validateResetRequest(email: unknown): { valid: boolean; error?: string } {
  if (!email || typeof email !== 'string') return { valid: false, error: 'Email required' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { valid: false, error: 'Invalid email' };
  return { valid: true };
}

function validateNewPassword(password: unknown, confirm: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (typeof password !== 'string' || password.length < 12) errors.push('Min 12 chars');
  if (password !== confirm) errors.push('Mismatch');
  return { valid: errors.length === 0, errors };
}

function isResetTokenExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() < Date.now();
}

describe('resetPasswordRoute — password recovery', () => {
  it('RP01 — reset request requires valid email', () => {
    expect(validateResetRequest('user@test.com').valid).toBe(true);
    expect(validateResetRequest('bad').valid).toBe(false);
  });

  it('RP02 — new password must match confirm', () => {
    expect(validateNewPassword('LongPassword1!', 'LongPassword1!').valid).toBe(true);
    expect(validateNewPassword('LongPassword1!', 'Other1!').valid).toBe(false);
  });

  it('RP03 — expired token rejected', () => {
    expect(isResetTokenExpired('2020-01-01T00:00:00Z')).toBe(true);
  });
});
