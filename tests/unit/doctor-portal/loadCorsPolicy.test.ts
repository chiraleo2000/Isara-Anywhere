/**
 * Doctor backend: loadCorsPolicy.cjs → shared corsPolicy helpers.
 */
import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const doctorBackend = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../../issara-doctor/backend',
);
const corsPath = path.join(doctorBackend, 'loadCorsPolicy.cjs');

describe('loadCorsPolicy', () => {
  it('resolves shared corsPolicy exports', () => {
    delete require.cache[corsPath];
    const cors = require(corsPath) as {
      buildIzaraCorsPolicy: (extra?: string[]) => { literals: Set<string>; patterns: RegExp[] };
      isIzaraOriginAllowed: (origin: string, policy: { literals: Set<string>; patterns: RegExp[] }) => boolean;
      createIzaraCorsOriginCallback: (
        policy: { literals: Set<string>; patterns: RegExp[] },
        options?: { allowNoOrigin?: boolean },
      ) => (origin: string | undefined, cb: (err: Error | null, ok?: boolean) => void) => void;
      LOCAL_DEV_ORIGINS: string[];
    };

    expect(typeof cors.buildIzaraCorsPolicy).toBe('function');
    expect(typeof cors.isIzaraOriginAllowed).toBe('function');
    expect(typeof cors.createIzaraCorsOriginCallback).toBe('function');
    expect(cors.LOCAL_DEV_ORIGINS.length).toBeGreaterThan(0);
  });

  it('allows localhost doctor origin and rejects unknown', () => {
    delete require.cache[corsPath];
    const cors = require(corsPath) as {
      buildIzaraCorsPolicy: () => { literals: Set<string>; patterns: RegExp[]; cloudRunPattern?: RegExp };
      isIzaraOriginAllowed: (
        origin: string,
        policy: { literals: Set<string>; patterns: RegExp[]; cloudRunPattern?: RegExp },
      ) => boolean;
    };
    const policy = cors.buildIzaraCorsPolicy();
    expect(cors.isIzaraOriginAllowed('http://localhost:5173', policy)).toBe(true);
    expect(cors.isIzaraOriginAllowed('https://evil.example', policy)).toBe(false);
  });

  it('createIzaraCorsOriginCallback denies unknown origins', () => {
    delete require.cache[corsPath];
    const cors = require(corsPath) as {
      buildIzaraCorsPolicy: () => { literals: Set<string>; patterns: RegExp[]; cloudRunPattern?: RegExp };
      createIzaraCorsOriginCallback: (
        policy: { literals: Set<string>; patterns: RegExp[]; cloudRunPattern?: RegExp },
      ) => (origin: string | undefined, cb: (err: Error | null, ok?: boolean) => void) => void;
    };
    const cb = cors.createIzaraCorsOriginCallback(cors.buildIzaraCorsPolicy());
    const allowed = vi.fn();
    const denied = vi.fn();
    cb('http://localhost:5173', allowed);
    cb('https://evil.example', denied);
    expect(allowed).toHaveBeenCalledWith(null, true);
    expect(denied.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(denied.mock.calls[0][1]).toBe(false);
  });
});
