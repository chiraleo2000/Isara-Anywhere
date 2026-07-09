/**
 * Auth guard for patient meeting — requires logged-in patient (like doctor meeting route).
 */
import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { isDemoAutoLoginEnabled } from '../utils/demoAutoAuth';
import { buildPatientMeetingPath } from '../utils/patientMeetingRoutes';
import PatientMeetingRoom from './PatientMeetingRoom';
import { JitsiMeetingShell } from '../features/meeting/JitsiMeetingShell';

function MeetingAuthSpinner() {
  return (
    <JitsiMeetingShell className="fixed inset-0 z-50 min-h-[100dvh] max-h-[100dvh]">
      <div
        className="flex flex-1 flex-col items-center justify-center min-h-[100dvh] bg-gray-900 text-white"
        data-testid="meeting-auth-starting"
      >
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mb-4" />
        <p className="text-gray-300 text-sm">กำลังเข้าสู่ระบบ...</p>
      </div>
    </JitsiMeetingShell>
  );
}

function resolvePatientUserId(user: { id?: string; patientId?: string } | null): string | null {
  if (!user) return null;
  return user.patientId || user.id || null;
}

/** Canonical route: /patient/:userId/meeting/:appointmentId */
export function PatientMeetingRouteGuard() {
  const { userId, appointmentId } = useParams<{ userId: string; appointmentId: string }>();
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading || (!user && isDemoAutoLoginEnabled())) {
    return <MeetingAuthSpinner />;
  }

  if (!isAuthenticated || !user || !appointmentId) {
    const returnTo = userId && appointmentId
      ? buildPatientMeetingPath(userId, appointmentId)
      : `/meeting/${appointmentId || ''}`;
    return <Navigate to="/login" replace state={{ returnTo }} />;
  }

  const sessionUserId = resolvePatientUserId(user);
  if (!sessionUserId) {
    return <Navigate to="/login" replace />;
  }

  if (userId && userId !== sessionUserId) {
    return <Navigate to={buildPatientMeetingPath(sessionUserId, appointmentId)} replace />;
  }

  return <PatientMeetingRoom />;
}

/** Redirect legacy /meeting/:id → /patient/:userId/meeting/:id */
export function LegacyPatientMeetingRedirect() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading || (!user && isDemoAutoLoginEnabled())) {
    return <MeetingAuthSpinner />;
  }

  if (!isAuthenticated || !user || !appointmentId) {
    return <Navigate to="/login" replace state={{ returnTo: `/meeting/${appointmentId}` }} />;
  }

  const sessionUserId = resolvePatientUserId(user);
  if (!sessionUserId) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={buildPatientMeetingPath(sessionUserId, appointmentId)} replace />;
}
