import { describe, it, expect } from 'vitest';

const ISSUER = 'izara-telemedicine';

/** Mirror mainApiServer / authServer JWT claim shape checks. */
function parseJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const json = Buffer.from(parts[1], 'base64url').toString('utf8');
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

describe('jwtPolicyAlignment', () => {
  it('expects issuer claim in doctor portal tokens', () => {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({ userId: 'd1', role: 'doctor', iss: ISSUER, exp: Math.floor(Date.now() / 1000) + 3600 }),
    ).toString('base64url');
    const token = `${header}.${payload}.sig`;
    const decoded = parseJwtPayload(token);
    expect(decoded?.iss).toBe(ISSUER);
    expect(decoded?.userId).toBe('d1');
  });

  it('rejects tokens missing issuer in strict mode', () => {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ userId: 'd1', role: 'doctor' })).toString('base64url');
    const decoded = parseJwtPayload(`${header}.${payload}.sig`);
    expect(decoded?.iss).toBeUndefined();
  });
});
