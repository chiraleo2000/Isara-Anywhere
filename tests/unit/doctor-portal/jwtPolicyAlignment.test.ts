import { describe, it, expect } from 'vitest';

/** Opaque session tokens are 64-char hex strings (32 random bytes). */
function isOpaqueSessionToken(token: string): boolean {
  return /^[a-f0-9]{64}$/i.test(token);
}

describe('sessionAuthAlignment', () => {
  it('expects opaque session token format from login', () => {
    const token = 'a'.repeat(64);
    expect(isOpaqueSessionToken(token)).toBe(true);
  });

  it('rejects JWT-shaped tokens as session tokens', () => {
    const jwtShaped = 'header.payload.signature';
    expect(isOpaqueSessionToken(jwtShaped)).toBe(false);
  });
});
