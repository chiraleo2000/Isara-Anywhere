/// <reference types="vitest/globals" />

declare module 'jsonwebtoken' {
  export interface JwtPayload {
    [key: string]: unknown;
  }
  export function sign(
    payload: string | Buffer | object,
    secretOrPrivateKey: string | Buffer,
    options?: { algorithm?: string; expiresIn?: string | number },
  ): string;
  export function verify(
    token: string,
    secretOrPublicKey: string | Buffer,
    options?: object,
  ): string | JwtPayload;
  const jwt: {
    sign: typeof sign;
    verify: typeof verify;
  };
  export default jwt;
}

declare module '@meeting/sessionAuth.js' {
  export interface CreateJitsiRoleJwtOptions {
    roomName?: string;
    user?: { id?: string; name?: string; email?: string };
    role?: string;
    domain?: string;
    signingSecret?: string;
    issuer?: string;
    enabled?: boolean;
  }

  export function createJitsiRoleJwt(options?: CreateJitsiRoleJwtOptions): string | null;
  export function validateGuestJoinAccess(opts: {
    authenticated: boolean;
    requestedRole: string;
    inviteValid: boolean;
  }): { allowed: boolean; code?: string; error?: string };
  export function generateOpaqueToken(): string;
  export function resolveSessionTokenFromRequest(req: {
    headers: Record<string, string | string[] | undefined>;
  }): string | null;
}
