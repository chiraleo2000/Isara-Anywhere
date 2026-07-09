/** Patient meeting routes — mirror doctor `/doctor/:userId/meeting/:appointmentId`. */

export function buildPatientMeetingPath(userId: string, appointmentId: string): string {
  const uid = encodeURIComponent(String(userId || '').trim());
  const apt = encodeURIComponent(String(appointmentId || '').trim());
  return `/patient/${uid}/meeting/${apt}`;
}

export function isPatientMeetingRoute(pathname?: string): boolean {
  const path = pathname ?? globalThis.location?.pathname ?? '';
  return /^\/patient\/[^/]+\/meeting\/[^/]+/.test(path) || /^\/meeting\/[^/]+/.test(path);
}

/** Legacy `/meeting/:id` and `/join/:id` — redirect to user-scoped path after auth. */
export function isLegacyPatientMeetingRoute(pathname?: string): boolean {
  const path = pathname ?? globalThis.location?.pathname ?? '';
  return /^\/meeting\/[^/]+/.test(path) || /^\/join\/[^/]+/.test(path);
}

export function extractLegacyMeetingAppointmentId(pathname?: string): string | null {
  const path = pathname ?? globalThis.location?.pathname ?? '';
  const match = path.match(/^\/(?:meeting|join)\/([^/]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}
