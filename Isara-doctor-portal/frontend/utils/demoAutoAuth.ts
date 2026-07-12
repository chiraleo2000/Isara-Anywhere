import { resolveEnv, resolveEnvBool } from './resolveEnv';

/** Dev/docker: skip login UI for seeded demo doctor (E2E + local UX). */
export function isDemoAutoLoginEnabled(): boolean {
  return resolveEnvBool('DEMO_AUTO_LOGIN');
}

/** Dev/E2E: honor ?appointmentId= deep-links on Health Meeting (never auto-jump on sidebar nav). */
export function isDemoAutoMeetingEnabled(): boolean {
  return resolveEnvBool('DEMO_AUTO_MEETING');
}

/** E2E/admin: ?stayOnQueue=1 keeps Health Meeting queue UI instead of autostart redirect. */
export function shouldStayOnHealthMeetingQueue(
  searchParams?: URLSearchParams | { get: (k: string) => string | null },
): boolean {
  return searchParams?.get('stayOnQueue') === '1';
}

/** Doctor in-app meeting route — silent auth must not redirect to /login. */
export function isDoctorMeetingRoute(pathname?: string): boolean {
  const path = pathname ?? globalThis.location?.pathname ?? '';
  return /^\/doctor\/[^/]+\/meeting\/[^/]+/.test(path);
}

/** Meeting URLs are public — identity is scoped by userId in the path + appointment id (no portal login). */
export function shouldBypassLoginRedirectForMeeting(pathname?: string): boolean {
  return isDoctorMeetingRoute(pathname);
}

export function getDemoDoctorCredentials(): { email: string; password: string } {
  return {
    email: resolveEnv('DEMO_DOCTOR_EMAIL', 'doctor.test@izara.com'),
    password: resolveEnv('DEMO_DOCTOR_PASSWORD', 'IzaraDoctor@2024'),
  };
}

/** E2E/a11y: keep /login and /reset-password reachable when DEMO_AUTO_LOGIN is on. */
export function shouldSkipDemoAutoLogin(): boolean {
  const path = globalThis.location?.pathname ?? '';
  return path === '/login' || path === '/reset-password';
}
