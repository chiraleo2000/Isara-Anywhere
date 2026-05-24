/**
 * Portal service readiness — health probes before auth and multi-browser fixture setup.
 */
import type { APIRequestContext } from '@playwright/test';

export interface PortalService {
  name: string;
  baseUrl: string;
  healthPath?: string;
}

export class PortalServicesUnavailableError extends Error {
  readonly services: string[];

  constructor(message: string, services: string[]) {
    super(message);
    this.name = 'PortalServicesUnavailableError';
    this.services = services;
  }
}

export class AuthSetupIncompleteError extends Error {
  readonly missingRoles: string[];

  constructor(missingRoles: string[]) {
    super(
      `E2E auth setup incomplete — missing tokens for: ${missingRoles.join(', ')}.\n` +
        'Ensure portals are running (docker compose up -d) and credentials match seed data.',
    );
    this.name = 'AuthSetupIncompleteError';
    this.missingRoles = missingRoles;
  }
}

function backoffMs(attempt: number): number {
  if (attempt <= 2) return 2_000;
  if (attempt <= 5) return 4_000;
  return 8_000;
}

/**
 * Poll /api/health until all services respond 200 or throw when strict.
 */
export async function waitForPortalServices(
  request: APIRequestContext,
  services: PortalService[],
  opts?: { maxAttempts?: number; strict?: boolean; requestTimeoutMs?: number },
): Promise<{ ready: string[]; failed: string[] }> {
  const maxAttempts = opts?.maxAttempts ?? 15;
  const strict = opts?.strict ?? true;
  const requestTimeoutMs = opts?.requestTimeoutMs ?? 10_000;
  const ready = new Set<string>();
  const failed: string[] = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await Promise.all(
      services.map(async (svc) => {
        if (ready.has(svc.name)) return;
        const path = svc.healthPath ?? '/api/health';
        try {
          const res = await request.get(`${svc.baseUrl}${path}`, { timeout: requestTimeoutMs });
          if (res.status() === 200) {
            ready.add(svc.name);
          }
        } catch {
          /* retry */
        }
      }),
    );

    if (ready.size === services.length) {
      return { ready: [...ready], failed: [] };
    }

    if (attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, backoffMs(attempt)));
    }
  }

  for (const svc of services) {
    if (!ready.has(svc.name)) failed.push(svc.name);
  }

  if (strict && failed.length > 0) {
    const cloudHint =
      process.env.TEST_ENV === 'cloud'
        ? 'Check CLOUD_*_URL / Cloud Run cold start, or set E2E_SKIP_HEALTH_GATE=1 after cloud:smoke passes.'
        : 'Start stack: docker compose up -d --build';
    throw new PortalServicesUnavailableError(
      `Services not ready after ${maxAttempts} attempts: ${failed.join(', ')}. ${cloudHint}`,
      failed,
    );
  }

  return { ready: [...ready], failed };
}

export function assertAuthTokensPresent(
  tokens: Record<string, string>,
  requiredRoles: string[],
): void {
  const missing = requiredRoles.filter((role) => !tokens[role]?.trim());
  if (missing.length > 0) {
    throw new AuthSetupIncompleteError(missing);
  }
}
