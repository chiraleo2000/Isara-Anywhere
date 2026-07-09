import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useLayoutEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SettingsProvider } from './contexts/SettingsContext';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import MainLayout from './components/MainLayout';
import { AppointmentListPage, BookAppointmentPage, AppointmentDetailPage } from './pages/AppointmentPages';
import PHRPage from './pages/PHRPage';
import AIDoctorPage from './pages/AIDoctorPage';
import MedicalContentLibrary from './pages/MedicalContentLibrary';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import NotificationsPage from './pages/NotificationsPage';
import PDPAPage from './pages/PDPAPage';
import LivingWillPage from './pages/LivingWillPage';
import TimelinePage from './pages/TimelinePage';
import MapPage from './pages/MapPage';
import GCSStatusPage from './pages/GCSStatusPage';
import { LegacyPatientMeetingRedirect, PatientMeetingRouteGuard } from './pages/PatientMeetingRoute';
import GuestMeetingJoin from './pages/GuestMeetingJoin';
import FindDoctorsPage from './pages/FindDoctorsPage';
import ErrorBoundary from './components/common/ErrorBoundary';

// Enhanced Scroll to top on route change - uses useLayoutEffect for immediate scroll
function ScrollToTop() {
  const { pathname } = useLocation();
  
  // Use useLayoutEffect for synchronous scroll before paint
  useLayoutEffect(() => {
    // Scroll to top immediately
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    
    // Also scroll any scrollable containers
    const mainContent = document.querySelector('main');
    if (mainContent) {
      mainContent.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [pathname]);
  
  return null;
}

type RouteGuardProps = Readonly<{ children: React.ReactNode }>;

function ProtectedRoute({ children }: RouteGuardProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-14 w-14 border-b-4 border-emerald-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicRoute({ children }: RouteGuardProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-14 w-14 border-b-4 border-emerald-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <Navigate to="/" replace /> : <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      
      {/* GCS Status page - accessible without login for testing */}
      <Route path="/gcs-status" element={<GCSStatusPage />} />
      
      {/* Guest meeting join - public, no auth required */}
      <Route path="/guest-join/:meetingId" element={<GuestMeetingJoin />} />
      <Route path="/guest/join/:token" element={<GuestMeetingJoin />} />

      {/* Full-screen meeting — authenticated patient (mirrors doctor /doctor/:userId/meeting/:id) */}
      <Route path="/patient/:userId/meeting/:appointmentId" element={<PatientMeetingRouteGuard />} />
      <Route path="/meeting/:appointmentId" element={<LegacyPatientMeetingRedirect />} />
      <Route path="/join/:appointmentId" element={<LegacyPatientMeetingRedirect />} />
      
      <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="appointments" element={<AppointmentListPage />} />
        <Route path="appointments/book" element={<BookAppointmentPage />} />
        <Route path="appointments/:id" element={<AppointmentDetailPage />} />
        <Route path="phr" element={<PHRPage />} />
        <Route path="ai-doctor" element={<AIDoctorPage />} />
        <Route path="health-library" element={<MedicalContentLibrary />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="pdpa" element={<PDPAPage />} />
        <Route path="living-will" element={<LivingWillPage />} />
        <Route path="timeline" element={<TimelinePage />} />
        <Route path="map" element={<MapPage />} />
        <Route path="find-doctors" element={<FindDoctorsPage />} />
        <Route path="admin/gcs" element={<GCSStatusPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <SettingsProvider>
        <BrowserRouter>
          <ScrollToTop />
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </SettingsProvider>
    </ErrorBoundary>
  );
}
