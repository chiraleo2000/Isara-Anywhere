/**
 * Unit tests for tests/helpers/service-readiness.ts
 */
import { describe, it, expect, vi } from 'vitest';
import {
  assertAuthTokensPresent,
  AuthSetupIncompleteError,
  PortalServicesUnavailableError,
  waitForPortalServices,
} from '../../helpers/service-readiness';

describe('service-readiness — auth gate (INF-03)', () => {
  it('SR01 — throws when required tokens missing', () => {
    expect(() =>
      assertAuthTokensPresent({ patient1: '', doctor: 'tok', admin: 'tok' }, [
        'patient1',
        'doctor',
        'admin',
      ]),
    ).toThrow(AuthSetupIncompleteError);
  });

  it('SR02 — passes when all tokens present', () => {
    expect(() =>
      assertAuthTokensPresent(
        { patient1: 'a', doctor: 'b', admin: 'c' },
        ['patient1', 'doctor', 'admin'],
      ),
    ).not.toThrow();
  });
});

describe('service-readiness — health probes (INF-01/02)', () => {
  it('SR03 — all services ready on first attempt', async () => {
    const request = {
      get: vi.fn().mockResolvedValue({ status: () => 200 }),
    };
    const result = await waitForPortalServices(
      request as never,
      [
        { name: 'Patient', baseUrl: 'http://localhost:3005' },
        { name: 'Meeting', baseUrl: 'http://localhost:3020', healthPath: '/health' },
      ],
      { maxAttempts: 3, strict: true },
    );
    expect(result.failed).toHaveLength(0);
    expect(result.ready).toHaveLength(2);
  });

  it('SR04 — strict mode throws PortalServicesUnavailableError', async () => {
    const request = {
      get: vi.fn().mockRejectedValue(new Error('ECONNREFUSED')),
    };
    await expect(
      waitForPortalServices(
        request as never,
        [{ name: 'Patient', baseUrl: 'http://localhost:3005' }],
        { maxAttempts: 2, strict: true },
      ),
    ).rejects.toBeInstanceOf(PortalServicesUnavailableError);
  });

  it('SR05 — non-strict returns failed list', async () => {
    const request = {
      get: vi.fn().mockRejectedValue(new Error('down')),
    };
    const result = await waitForPortalServices(
      request as never,
      [{ name: 'Doctor', baseUrl: 'http://localhost:3010' }],
      { maxAttempts: 1, strict: false },
    );
    expect(result.failed).toContain('Doctor');
  });
});
