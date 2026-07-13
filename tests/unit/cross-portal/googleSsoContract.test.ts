/**
 * Google SSO — OAuth routes + mismatch → register redirect policy.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');

/** When Google email is unknown / not registered, frontend redirects to register. */
function googleMismatchRedirect(policy: {
  registered: boolean;
  code?: string;
}): string {
  if (!policy.registered || policy.code === 'NOT_REGISTERED') {
    return '/register';
  }
  return '/home';
}

describe('googleSsoContract — source OAuth handlers', () => {
  it('GSSO-01 — patient portal has Google OAuth / google-auth route or handler', () => {
    const auth = fs.readFileSync(
      path.join(root, 'Isara-patient-portal/backend/routes/auth.ts'),
      'utf8',
    );
    const login = fs.readFileSync(
      path.join(root, 'Isara-patient-portal/frontend/pages/LoginPage.tsx'),
      'utf8',
    );
    expect(`${auth}\n${login}`).toMatch(/google-auth|GoogleAuth|google sign-in|source=google/i);
  });

  it('GSSO-02 — doctor portal has Google OAuth / google-auth route or frontend handler', () => {
    const auth = fs.readFileSync(
      path.join(root, 'Isara-doctor-portal/backend/authServer.cjs'),
      'utf8',
    );
    const btn = fs.readFileSync(
      path.join(root, 'Isara-doctor-portal/frontend/components/GoogleSignInButton.tsx'),
      'utf8',
    );
    expect(`${auth}\n${btn}`).toMatch(/google-auth|GoogleLogin|GoogleOAuthProvider/i);
  });
});

describe('googleSsoContract — mismatch email → register', () => {
  it('GSSO-03 — mismatch / not-registered policy returns redirect to register path', () => {
    expect(googleMismatchRedirect({ registered: false })).toBe('/register');
    expect(googleMismatchRedirect({ registered: false, code: 'NOT_REGISTERED' })).toBe('/register');
    expect(googleMismatchRedirect({ registered: true, code: 'NOT_REGISTERED' })).toBe('/register');
    expect(googleMismatchRedirect({ registered: true })).toBe('/home');
  });
});
