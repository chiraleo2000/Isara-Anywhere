/**
 * Auth lockout — login_attempts / locked_until contract (doctor + patient).
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');

const LOCKOUT_THRESHOLD = 5;

function nextLoginAttempts(attempts: number): { attempts: number; locked: boolean } {
  const next = attempts + 1;
  return { attempts: next, locked: next >= LOCKOUT_THRESHOLD };
}

function isAccountLocked(lockedUntil: Date | string | null | undefined, now: Date): boolean {
  if (!lockedUntil) return false;
  return new Date(lockedUntil).getTime() > now.getTime();
}

describe('authLockoutContract — pure lockout logic', () => {
  it('AL-01 — nextLoginAttempts increments', () => {
    expect(nextLoginAttempts(0)).toEqual({ attempts: 1, locked: false });
    expect(nextLoginAttempts(3)).toEqual({ attempts: 4, locked: false });
  });

  it('AL-02 — nextLoginAttempts sets locked when >= 5', () => {
    expect(nextLoginAttempts(4)).toEqual({ attempts: 5, locked: true });
    expect(nextLoginAttempts(5)).toEqual({ attempts: 6, locked: true });
  });

  it('AL-03 — isAccountLocked true when lockedUntil > now', () => {
    const now = new Date('2026-07-13T10:00:00Z');
    expect(isAccountLocked('2026-07-13T10:15:00Z', now)).toBe(true);
    expect(isAccountLocked('2026-07-13T09:59:00Z', now)).toBe(false);
    expect(isAccountLocked(null, now)).toBe(false);
  });
});

describe('authLockoutContract — source strings', () => {
  it('AL-04 — doctor authServer.cjs mentions login_attempts and locked_until', () => {
    const src = fs.readFileSync(
      path.join(root, 'issara-doctor/backend/authServer.cjs'),
      'utf8',
    );
    expect(src).toMatch(/login_attempts/);
    expect(src).toMatch(/locked_until/);
  });

  it('AL-05 — patient auth route or middleware mentions locked / 429 / lock', () => {
    const authRoute = fs.readFileSync(
      path.join(root, 'issara-patient/backend/routes/auth.ts'),
      'utf8',
    );
    const owasp = fs.readFileSync(
      path.join(root, 'issara-patient/backend/middleware/owasp-middleware.ts'),
      'utf8',
    );
    const combined = `${authRoute}\n${owasp}`;
    expect(combined).toMatch(/429|locked|lock/i);
  });
});
