import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useLayoutEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SettingsProvider } from './contexts/SettingsContext';

import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import MainLayout from './components/layout/MainLayout';
import { AppointmentListPage, BookAppointmentPage, AppointmentDetailPage } from './pages/appointments/AppointmentPages';
import PHRPage from './pages/health/PHRPage';
import AIDoctorPage from './pages/health/AIDoctorPage';
import MedicalContentLibrary from './pages/health/MedicalContentLibrary';
import ProfilePage from './pages/profile/ProfilePage';
import SettingsPage from './pages/settings/SettingsPage';
import PDPAPage from './pages/pdpa/PDPAPage';
import LivingWillPage from './pages/pdpa/LivingWillPage';
import TimelinePage from './pages/timeline/TimelinePage';
import GCSStatusPage from './pages/admin/GCSStatusPage';

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-emerald-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">กำลังโหลด...</p>
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-emerald-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">กำลังโหลด...</p>
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
        <Route path="pdpa" element={<PDPAPage />} />
        <Route path="living-will" element={<LivingWillPage />} />
        <Route path="timeline" element={<TimelinePage />} />
        <Route path="admin/gcs" element={<GCSStatusPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <BrowserRouter>
        <ScrollToTop />
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </SettingsProvider>
  );
}
