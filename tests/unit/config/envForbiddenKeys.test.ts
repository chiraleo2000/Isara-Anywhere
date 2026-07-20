/**
 * Forbidden cloud/env secrets — keys that must not ship with non-empty values.
 */
import { describe, it, expect } from 'vitest';

/** Key names and value patterns that must not appear as real secrets in cloud env. */
const FORBIDDEN_CLOUD_KEYS = [
  'AWS_SECRET_ACCESS_KEY',
  'AWS_ACCESS_KEY_ID',
  'GCP_PRIVATE_KEY',
  'GOOGLE_PRIVATE_KEY',
  'PRIVATE_KEY',
] as const;

const PRIVATE_KEY_PEM_RE = /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/;

function assertNoForbiddenEnvKeys(env: Record<string, string | undefined>): void {
  for (const [key, raw] of Object.entries(env)) {
    const value = raw ?? '';
    if (!String(value).trim()) continue;

    if ((FORBIDDEN_CLOUD_KEYS as readonly string[]).includes(key)) {
      throw new Error(`Forbidden cloud env key present with non-empty value: ${key}`);
    }
    if (/SECRET_ACCESS_KEY|PRIVATE_KEY/i.test(key) && !['JWT_SECRET'].includes(key)) {
      throw new Error(`Forbidden secret-like env key present: ${key}`);
    }
    if (PRIVATE_KEY_PEM_RE.test(value)) {
      throw new Error(`Forbidden private key PEM material in env value for ${key}`);
    }
  }
}

describe('envForbiddenKeys', () => {
  it('EFK-01 — FORBIDDEN_CLOUD_KEYS includes AWS secret and private-key style names', () => {
    expect(FORBIDDEN_CLOUD_KEYS).toContain('AWS_SECRET_ACCESS_KEY');
    expect(FORBIDDEN_CLOUD_KEYS.some((k) => /PRIVATE_KEY/i.test(k))).toBe(true);
    expect(PRIVATE_KEY_PEM_RE.test('-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----')).toBe(true);
  });

  it('EFK-02 — assertNoForbiddenEnvKeys throws when forbidden key has non-empty value', () => {
    expect(() =>
      assertNoForbiddenEnvKeys({ AWS_SECRET_ACCESS_KEY: 'AKIASECRET' }),
    ).toThrow(/Forbidden cloud env key/);
    expect(() =>
      assertNoForbiddenEnvKeys({
        SERVICE_ACCOUNT: '-----BEGIN PRIVATE KEY-----\nMIIE\n-----END PRIVATE KEY-----',
      }),
    ).toThrow(/private key PEM/i);
  });

  it('EFK-03 — JWT_SECRET and GEMINI_API_KEY placeholders pass', () => {
    expect(() =>
      assertNoForbiddenEnvKeys({
        JWT_SECRET: 'your-secure-jwt-secret-key-min-32-chars',
        GEMINI_API_KEY: 'xxxxx',
      }),
    ).not.toThrow();
  });

  it('EFK-04 — empty forbidden keys are ignored', () => {
    expect(() =>
      assertNoForbiddenEnvKeys({
        AWS_SECRET_ACCESS_KEY: '',
        AWS_ACCESS_KEY_ID: '   ',
        JWT_SECRET: 'ok-placeholder-value-32chars-min!!',
      }),
    ).not.toThrow();
  });
});
