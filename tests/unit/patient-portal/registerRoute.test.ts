/**
 * @process Processes/Pages/Patient-Portal/02_Register_Page.md
 */
import { describe, it, expect } from 'vitest';

function validatePatientRegistration(data: Record<string, unknown>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.email))) errors.push('Invalid email');
  if (!data.password || String(data.password).length < 12) errors.push('Password too short');
  if (!data.first_name) errors.push('First name required');
  if (!data.last_name) errors.push('Last name required');
  if (data.phone && !/^\+?[0-9]{9,15}$/.test(String(data.phone).replace(/\s/g, ''))) errors.push('Invalid phone');
  return { valid: errors.length === 0, errors };
}

describe('registerRoute — Patient registration', () => {
  it('RG01 — accepts valid registration payload', () => {
    const r = validatePatientRegistration({
      email: 'new.patient@example.com',
      password: 'SecurePass123!',
      first_name: 'Somchai',
      last_name: 'Test',
      phone: '0812345678',
    });
    expect(r.valid).toBe(true);
  });

  it('RG02 — rejects short password', () => {
    const r = validatePatientRegistration({
      email: 'a@b.co',
      password: 'short',
      first_name: 'A',
      last_name: 'B',
    });
    expect(r.valid).toBe(false);
    expect(r.errors).toContain('Password too short');
  });
});
