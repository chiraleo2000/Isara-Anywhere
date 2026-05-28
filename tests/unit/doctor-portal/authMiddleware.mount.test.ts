import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { sanitizeRequestBody } = require('../../../Isara-doctor-portal/server/security/owasp-middleware.cjs');

/**
 * Documents correct auth middleware chain order: json -> sanitizeRequestBody() -> handler
 */
describe('Auth middleware mount contract', () => {
  it('production must use sanitizeRequestBody() factory invocation', () => {
    const factory = sanitizeRequestBody;
    expect(typeof factory).toBe('function');
    const middleware = factory();
    expect(typeof middleware).toBe('function');
    expect(middleware.length).toBe(3);
  });

  it('factory middleware completes synchronously for valid login body', () => {
    const req = {
      path: '/auth/login',
      body: {
        email: 'admin.test@izara.com',
        password: 'IzaraAdmin@2024',
        deviceId: 't',
        userAgent: 'vitest',
      },
    };
    let done = false;
    const res = {
      statusCode: 0,
      status(c: number) {
        this.statusCode = c;
        return this;
      },
      json() {
        return this;
      },
    };
    const started = Date.now();
    sanitizeRequestBody()(req, res, () => {
      done = true;
    });
    expect(done).toBe(true);
    expect(Date.now() - started).toBeLessThan(500);
  });
});
