/**
 * Regression: app.use(sanitizeRequestBody) without () hangs requests (never calls next).
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { sanitizeRequestBody } = require('../../../Isara-doctor-portal/server/security/owasp-middleware.cjs');

type Req = { body: Record<string, unknown>; path: string };
type Res = {
  statusCode: number;
  jsonBody: unknown;
  status(code: number): Res;
  json(body: unknown): Res;
};

function mockRes(): Res {
  const res: Res = {
    statusCode: 200,
    jsonBody: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.jsonBody = body;
      return this;
    },
  };
  return res;
}

async function runMiddleware(
  middleware: (req: Req, res: Res, next: (err?: unknown) => void) => void,
  req: Req,
): Promise<{ nextCalled: boolean; res: Res }> {
  const res = mockRes();
  let nextCalled = false;
  await new Promise<void>((resolve) => {
    middleware(req, res, () => {
      nextCalled = true;
      resolve();
    });
  });
  return { nextCalled, res };
}

describe('sanitizeRequestBody middleware factory', () => {
  it('calls next() when mounted as sanitizeRequestBody()', async () => {
    const req: Req = {
      path: '/auth/login',
      body: {
        email: 'doctor.test@izara.com',
        password: 'IzaraDoctor@2024',
        userAgent: 'Mozilla/5.0 test',
        deviceId: 'vitest',
      },
    };
    const { nextCalled, res } = await runMiddleware(sanitizeRequestBody(), req);
    expect(nextCalled).toBe(true);
    expect(res.statusCode).toBe(200);
    expect(req.body.email).toBe('doctor.test@izara.com');
  });

  it('wrong mount: bare sanitizeRequestBody does not call next', async () => {
    const req: Req = { path: '/probe', body: { email: 'a@b.com' } };
    const res = mockRes();
    let nextCalled = false;
    // Simulate Express calling the factory as middleware (the bug)
    const wrongMount = sanitizeRequestBody as (req: Req, res: Res, next: () => void) => void;
    wrongMount(req, res, () => {
      nextCalled = true;
    });
    expect(nextCalled).toBe(false);
  });

  it('skips injection regex on password and userAgent', async () => {
    const req: Req = {
      path: '/auth/login',
      body: {
        email: 'doctor.test@izara.com',
        password: 'P@ss;word!($)',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0)',
        deviceId: 'x',
      },
    };
    await runMiddleware(sanitizeRequestBody(), req);
    expect(req.body.password).toBe('P@ss;word!($)');
    expect(req.body.userAgent).toBe('Mozilla/5.0 (Windows NT 10.0)');
  });
});
