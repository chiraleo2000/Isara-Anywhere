/**
 * @process Processes/Pages/Doctor-Portal/01_Login_Page.md
 * Doctor login API response contract (AUTH-RES-01–03).
 */
import { describe, it, expect } from 'vitest';

interface LoginSuccessBody {
  token: string;
  user: { id: string; role: string; email: string };
}

interface LoginErrorBody {
  error: string;
  code?: string;
}

function parseLoginSuccess(body: unknown): LoginSuccessBody | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  const user = b.user;
  if (typeof b.token !== 'string' || !user || typeof user !== 'object') return null;
  const u = user as Record<string, unknown>;
  if (typeof u.id !== 'string' || typeof u.role !== 'string' || typeof u.email !== 'string') return null;
  return { token: b.token, user: { id: u.id, role: u.role, email: u.email } };
}

function parseLoginError(body: unknown): LoginErrorBody | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  if (typeof b.error !== 'string') return null;
  return { error: b.error, code: typeof b.code === 'string' ? b.code : undefined };
}

describe('doctor-portal authLoginResponse contract', () => {
  it('AUTH-RES-01 — success response includes token, user.id, user.role', () => {
    const parsed = parseLoginSuccess({
      token: 'jwt-token-abc',
      user: { id: 'DOC-TEST-001', role: 'doctor', email: 'doctor.test@izara.com' },
    });
    expect(parsed).not.toBeNull();
    expect(parsed!.token).toBe('jwt-token-abc');
    expect(parsed!.user.id).toBe('DOC-TEST-001');
    expect(parsed!.user.role).toBe('doctor');
  });

  it('AUTH-RES-02 — rejects malformed success (missing role)', () => {
    expect(parseLoginSuccess({ token: 'x', user: { id: '1', email: 'a@b.com' } })).toBeNull();
  });

  it('AUTH-RES-03 — error response exposes error and optional code', () => {
    const parsed = parseLoginError({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
    expect(parsed?.error).toBe('Invalid credentials');
    expect(parsed?.code).toBe('INVALID_CREDENTIALS');
  });
});
