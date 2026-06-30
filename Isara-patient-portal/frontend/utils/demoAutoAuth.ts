import { resolveEnv, resolveEnvBool } from './resolveEnv';

/** Dev/docker: skip login UI for seeded demo patient (E2E + local UX). */
export function isDemoAutoLoginEnabled(): boolean {
  return resolveEnvBool('DEMO_AUTO_LOGIN');
}

/** Dev/docker: auto-navigate confirmed telehealth appointments into /meeting/:id. */
export function isDemoAutoMeetingEnabled(): boolean {
  return resolveEnvBool('DEMO_AUTO_MEETING');
}

export function getDemoPatientCredentials(): { email: string; password: string } {
  return {
    email: resolveEnv('DEMO_PATIENT_EMAIL', 'demo.test@gmail.com'),
    password: resolveEnv('DEMO_PATIENT_PASSWORD', 'P@ssw0rd'),
  };
}

/** E2E/auth shells: never hijack /register, /reset-password, or /login with silent login. */
export function shouldSkipDemoAutoLogin(): boolean {
  const path = globalThis.location?.pathname ?? '';
  return path === '/register' || path === '/reset-password' || path === '/login';
}
