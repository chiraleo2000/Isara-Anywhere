export interface SessionReqUser {
  id?: string | number;
  userId?: string | number;
  email?: string;
  role?: string;
  name?: string;
  doctorId?: string | null;
  patientId?: string | null;
  isAdmin?: boolean;
}

export interface CreateJitsiRoleJwtOptions {
  roomName?: string;
  user?: { id?: string; name?: string; email?: string };
  role?: string;
  domain?: string;
  signingSecret?: string;
  issuer?: string;
  enabled?: boolean;
}

export function sessionRowToReqUser(row: Record<string, unknown> | null | undefined): SessionReqUser | null;

export function validateSessionToken(
  pool: { query: (sql: string, params: unknown[]) => Promise<{ rows: Record<string, unknown>[] }> },
  token: string,
): Promise<Record<string, unknown> | null>;

export function resolveSessionTokenFromRequest(req: {
  headers: Record<string, string | string[] | undefined>;
}): string | null;

export function createAuthenticateSession(
  pool: Parameters<typeof validateSessionToken>[0],
): (req: unknown, res: unknown, next: () => void) => Promise<void>;

export function createOptionalSessionAuth(
  pool: Parameters<typeof validateSessionToken>[0],
): (req: unknown, res: unknown, next: () => void) => Promise<void>;

export function requireRole(
  ...allowedRoles: string[]
): (req: unknown, res: unknown, next: () => void) => void;

export function generateOpaqueToken(): string;

export function validateGuestJoinAccess(opts: {
  authenticated: boolean;
  requestedRole: string;
  inviteValid: boolean;
}): { allowed: boolean; code?: string; error?: string };

export function createJitsiRoleJwt(options?: CreateJitsiRoleJwtOptions): string | null;
