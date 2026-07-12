import { resolveEnv, resolveEnvBool } from './resolveEnv';
import { isPatientMeetingRoute } from './patientMeetingRoutes';

/** Dev/docker: skip login UI for seeded demo patient (E2E + local UX). */
export function isDemoAutoLoginEnabled(): boolean {
  return resolveEnvBool('DEMO_AUTO_LOGIN');
}

/** Patient in-app meeting route — silent auth must not redirect to /login. */
export function isPatientMeetingPath(pathname?: string): boolean {
  return isPatientMeetingRoute(pathname);
}

/** Meeting URLs are public — identity is scoped by userId in the path + appointment id (no portal login). */
export function shouldBypassLoginRedirectForMeeting(pathname?: string): boolean {
  return isPatientMeetingRoute(pathname);
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
