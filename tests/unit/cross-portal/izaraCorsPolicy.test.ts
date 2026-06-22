/**
 * Unified CORS policy — CORS_ORIGINS + localhost/LAN defaults only.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  buildIzaraCorsPolicy,
  isIzaraOriginAllowed,
  createIzaraCorsOriginCallback,
} from '../../../shared/corsPolicy.cjs';

describe('izaraCorsPolicy', () => {
  const prevCors = process.env.CORS_ORIGINS;
  const prevNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.NODE_ENV = 'development';
    process.env.CORS_ORIGINS =
      'http://localhost:3005,http://localhost:3010,http://localhost:3020';
  });

  afterEach(() => {
    if (prevCors === undefined) delete process.env.CORS_ORIGINS;
    else process.env.CORS_ORIGINS = prevCors;
    if (prevNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = prevNodeEnv;
  });

  it('ICP01 — allows portal and meeting origins from CORS_ORIGINS', () => {
    const policy = buildIzaraCorsPolicy();
    expect(isIzaraOriginAllowed('http://localhost:3005', policy)).toBe(true);
    expect(isIzaraOriginAllowed('http://localhost:3010', policy)).toBe(true);
    expect(isIzaraOriginAllowed('http://localhost:3020', policy)).toBe(true);
  });

  it('ICP02 — blocks unknown origins', () => {
    const policy = buildIzaraCorsPolicy();
    expect(isIzaraOriginAllowed('https://evil.example.com', policy)).toBe(false);
  });

  it('ICP03 — cors callback denies unknown origin', async () => {
    const policy = buildIzaraCorsPolicy();
    const cb = createIzaraCorsOriginCallback(policy);
    await expect(
      new Promise<boolean>((resolve, reject) => {
        cb('https://evil.example.com', (err, ok) => {
          if (err) reject(err);
          else resolve(Boolean(ok));
        });
      }),
    ).rejects.toThrow(/CORS policy violation/i);
  });

  it('ICP04 — allows no-origin for same-origin/server requests', () => {
    const policy = buildIzaraCorsPolicy();
    const cb = createIzaraCorsOriginCallback(policy);
    const allowed = new Promise<boolean>((resolve) => {
      cb(undefined, (_err, ok) => resolve(Boolean(ok)));
    });
    return expect(allowed).resolves.toBe(true);
  });

  it('ICP05 — allows Mode B LAN subdomains (*.isara.local)', () => {
    const policy = buildIzaraCorsPolicy();
    expect(isIzaraOriginAllowed('http://doctor.isara.local', policy)).toBe(true);
    expect(isIzaraOriginAllowed('http://patient.isara.local', policy)).toBe(true);
    expect(isIzaraOriginAllowed('http://meeting.isara.local', policy)).toBe(true);
    expect(isIzaraOriginAllowed('http://custom.isara.local', policy)).toBe(true);
  });
});
