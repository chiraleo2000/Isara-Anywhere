/**
 * Isara Doctor Portal - Main Application with React Router
 * 
 * URL Structure:
 * - /login - Login page
 * - /register - Registration page  
 * - /doctor/:userId/dashboard - Doctor dashboard
 * - /doctor/:userId/schedule - Schedule management
 * - /doctor/:userId/patients - Patient list
 * - /doctor/:userId/patients/:patientId - Patient detail
 * - /doctor/:userId/queue - Queue management
 * - /doctor/:userId/lab - Lab orders
 * - /doctor/:userId/messages - Messages
 * - /doctor/:userId/resources - Clinical resources
 */
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, ProtectedRoute } from './components/common/AuthProvider';
import { SettingsProvider } from './hooks/useSettings';
import LoginPage from './pages/LoginPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DoctorPortal from './pages/DoctorPortal';

// Loading component
const LoadingScreen: React.FC = () => (
  <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-emerald-600 mx-auto mb-4"></div>
      <p className="text-gray-600">Loading...</p>
    </div>
  </div>
);

// Home redirect - checks auth and redirects appropriately
const HomeRedirect: React.FC = () => {
  return <Navigate to="/login" replace />;
};

const App: React.FC = () => {
  return (
    <SettingsProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            
            {/* Protected doctor routes - accessible by doctors and admins */}
            <Route
              path="/doctor/:userId/*"
              element={
                <ProtectedRoute allowedRoles={['doctor', 'admin']}>
                  <DoctorPortal />
                </ProtectedRoute>
              }
            />
            
            {/* Root redirect */}
            <Route path="/" element={<HomeRedirect />} />
            
            {/* Catch all - redirect to login */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </SettingsProvider>
  );
};

export default App;
