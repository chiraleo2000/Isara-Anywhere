/**
 * Patient meeting routes — no portal login required.
 * Identity is scoped by /patient/:userId/meeting/:appointmentId (or legacy /meeting/:id).
 */
import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { buildPatientMeetingPath } from '../utils/patientMeetingRoutes';
import PatientMeetingRoom from './PatientMeetingRoom';

function resolvePatientUserId(user: { id?: string; patientId?: string } | null): string | null {
  if (!user) return null;
  return user.patientId || user.id || null;
}

/** Canonical route: /patient/:userId/meeting/:appointmentId */
export function PatientMeetingRouteGuard() {
  const { userId, appointmentId } = useParams<{ userId: string; appointmentId: string }>();
  const { user, isAuthenticated } = useAuth();

  if (!appointmentId) {
    return <Navigate to="/" replace />;
  }

  if (isAuthenticated && user) {
    const sessionUserId = resolvePatientUserId(user);
    if (sessionUserId && userId && userId !== sessionUserId) {
      return <Navigate to={buildPatientMeetingPath(sessionUserId, appointmentId)} replace />;
    }
  }

  return <PatientMeetingRoom routeUserId={userId} />;
}

/** Legacy /meeting/:id — prefer canonical /patient/:userId/meeting/:id when session known. */
export function LegacyPatientMeetingPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const { user, isAuthenticated } = useAuth();
  if (!appointmentId) {
    return <Navigate to="/" replace />;
  }
  if (isAuthenticated && user) {
    const sessionUserId = resolvePatientUserId(user);
    if (sessionUserId) {
      return <Navigate to={buildPatientMeetingPath(sessionUserId, appointmentId)} replace />;
    }
  }
  return <PatientMeetingRoom />;
}

/** Redirect /join/:id → canonical patient meeting path when possible, else legacy /meeting/:id */
export function LegacyPatientJoinRedirect() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const { user, isAuthenticated } = useAuth();
  if (!appointmentId) {
    return <Navigate to="/" replace />;
  }
  if (isAuthenticated && user) {
    const sessionUserId = resolvePatientUserId(user);
    if (sessionUserId) {
      return <Navigate to={buildPatientMeetingPath(sessionUserId, appointmentId)} replace />;
    }
  }
  return <Navigate to={`/meeting/${appointmentId}`} replace />;
}

/** @deprecated Use LegacyPatientMeetingPage */
export function LegacyPatientMeetingRedirect() {
  return <LegacyPatientMeetingPage />;
}
