import { describe, it, expect } from 'vitest';
import { validateDoctorPassword } from '../../../Isara-doctor-portal/frontend/utils/passwordPolicy';

describe('validateDoctorPassword', () => {
  it('accepts OWASP-compliant password', () => {
    const result = validateDoctorPassword('SecurePass123!');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects short passwords', () => {
    const result = validateDoctorPassword('Short1!');
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('12'))).toBe(true);
  });

  it('rejects passwords missing complexity', () => {
    const result = validateDoctorPassword('alllowercase12!!');
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('uppercase'))).toBe(true);
  });
});
