import { describe, it, expect } from 'vitest';
import { validatePassword } from '../../../../issara-doctor/backend/security/owasp-middleware.cjs';

describe('validatePassword', () => {
  it('accepts OWASP-compliant password', () => {
    const result = validatePassword('SecurePass123!');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects short passwords', () => {
    const result = validatePassword('Short1!');
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('12'))).toBe(true);
  });

  it('rejects passwords missing complexity', () => {
    const result = validatePassword('alllowercase12!!');
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('uppercase'))).toBe(true);
  });
});
