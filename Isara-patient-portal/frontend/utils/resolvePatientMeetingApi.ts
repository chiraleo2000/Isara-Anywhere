/**
 * Patient-portal meeting API routing.
 * Same-origin BFF (/api/video-meeting) injects JWT from session — avoids 401 on direct :3020.
 */
import { resolveMeetingServerUrl } from './resolveMeetingServerUrl';

function isPatientPortalOrigin(): boolean {
  if (typeof globalThis.location === 'undefined') return false;
  const host = globalThis.location.hostname || '';
  const port = globalThis.location.port || '';
  if (port === '3005') return true;
  if (host.includes('patient-portal') || host.includes('izara-patient')) return true;
  return false;
}

/** Base path for meeting API calls from the patient browser. */
export function resolvePatientMeetingApiBase(): string {
  if (isPatientPortalOrigin()) return '/api/video-meeting';
  return `${resolveMeetingServerUrl()}/api/meetings`;
}

/** Build a meeting API URL for the patient portal (BFF or direct meeting-server). */
export function patientMeetingUrl(meetingId: string, suffix: string): string {
  const base = resolvePatientMeetingApiBase();
  if (base.startsWith('/')) {
    return `${base}/${encodeURIComponent(meetingId)}${suffix}`;
  }
  return `${base}/${encodeURIComponent(meetingId)}${suffix}`;
}
