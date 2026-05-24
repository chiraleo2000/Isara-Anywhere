/**
 * Object-level access control for meeting recordings.
 */
import { resolveActorUserId } from './meetingAuth.js';

export function isAdminUser(user) {
  return user?.role === 'admin' || user?.isAdmin === true;
}

export function isDoctorRole(user) {
  return user?.role === 'doctor' || user?.role === 'moderator' || Boolean(user?.doctorId);
}

export function isPatientRole(user) {
  return user?.role === 'patient';
}

/**
 * @param {{ user?: object, meeting?: { doctor_id?: string, patient_id?: string } }} ctx
 * @returns {{ allowed: boolean, status?: number, error?: string }}
 */
export function assertCanAccessMeetingRecording({ user, meeting }) {
  if (!user) {
    return { allowed: false, status: 401, error: 'Authentication required' };
  }
  if (!meeting) {
    return { allowed: false, status: 404, error: 'Meeting not found' };
  }
  if (isAdminUser(user)) {
    return { allowed: true };
  }

  const actorId = resolveActorUserId(user);
  const doctorId = meeting.doctor_id || meeting.doctorId;
  const patientId = meeting.patient_id || meeting.patientId;

  if (user?.role === 'guest' || user?.type === 'guest-invite') {
    return { allowed: false, status: 403, error: 'Guests cannot access recordings directly' };
  }

  if (isDoctorRole(user)) {
    const docMatch =
      (doctorId && actorId && String(doctorId) === String(actorId)) ||
      (doctorId && user?.doctorId && String(doctorId) === String(user.doctorId));
    if (docMatch) return { allowed: true };
    return { allowed: false, status: 403, error: 'Access denied' };
  }

  if (isPatientRole(user)) {
    if (patientId && actorId && String(patientId) === String(actorId)) {
      return { allowed: true };
    }
    return { allowed: false, status: 403, error: 'Access denied' };
  }

  if (actorId && doctorId && String(actorId) === String(doctorId)) {
    return { allowed: true };
  }
  if (actorId && patientId && String(actorId) === String(patientId)) {
    return { allowed: true };
  }

  return { allowed: false, status: 403, error: 'Access denied' };
}

/**
 * Filter DB rows to those visible to the authenticated user.
 */
export function filterRecordingsForUser(rows, user) {
  if (!Array.isArray(rows)) return [];
  if (isAdminUser(user)) return rows;
  return rows.filter((row) => {
    const meeting = {
      doctor_id: row.doctor_id,
      patient_id: row.patient_id,
    };
    return assertCanAccessMeetingRecording({ user, meeting }).allowed;
  });
}

/**
 * Build app-relative playback URL (no gs:// leakage).
 */
export function buildSecureRecordingUrl({ doctorId, meetingId, filename }) {
  const safeName = filename || 'video.webm';
  return `/api/recordings/meetings/${doctorId}/${meetingId}/${safeName}`;
}
