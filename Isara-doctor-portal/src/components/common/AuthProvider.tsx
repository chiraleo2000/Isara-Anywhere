/**
 * Authentication Provider - Manages auth state with React Router
 */
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { User } from '../../types';
import { authService, initTokenRefreshTimer } from '../../services/authServices';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  loginWithGoogle: (idToken: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  refreshUser: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const redirectToDashboard = useCallback((currentUser: User) => {
    if (location.pathname === '/login' || location.pathname === '/') {
      const basePath = (currentUser.role === 'doctor' || currentUser.role === 'admin') ? '/doctor' : '/patient';
      navigate(`${basePath}/${currentUser.id}/dashboard`, { replace: true });
    }
  }, [location.pathname, navigate]);

  const verifySessionWithServer = useCallback(async (token: string, currentUser: User): Promise<User | null> => {
    try {
      const response = await fetch('/auth/verify', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        console.log('⚠️ Could not verify session, using cached user');
        return currentUser;
      }

      const data = await response.json();
      if (!data.valid || !data.user) {
        console.log('⚠️ Session invalid on server, logging out');
        authService.logout();
        navigate('/login', { replace: true });
        return null;
      }

      const syncedUser = {
        ...currentUser,
        isAdmin: data.user.isAdmin || false,
        adminPrivileges: data.user.adminPrivileges || undefined,
      };
      localStorage.setItem('izara_current_user', JSON.stringify(syncedUser));
      console.log('✅ Session restored and synced:', syncedUser.email);
      if (syncedUser.isAdmin) {
        console.log('👑 Admin privileges active:', JSON.stringify(syncedUser.adminPrivileges));
      }
      return syncedUser;
    } catch (verifyError) {
      console.warn('⚠️ Session verification failed, using cached user:', verifyError);
      return currentUser;
    }
  }, [navigate]);

  useEffect(() => {
    const checkAuth = async () => {
      setLoading(true);
      try {
        const currentUser = authService.getCurrentUser();
        const token = authService.getToken();

        if (!currentUser || !token) {
          setUser(null);
          if (!location.pathname.startsWith('/login')) {
            navigate('/login', { replace: true });
          }
          return;
        }

        const verifiedUser = await verifySessionWithServer(token, currentUser);
        setUser(verifiedUser ?? null);
        if (verifiedUser) {
          // Restart token refresh timer from stored JWT
          initTokenRefreshTimer();
          redirectToDashboard(verifiedUser);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [verifySessionWithServer, redirectToDashboard, location.pathname, navigate]);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      const result = await authService.login({ email, password });
      
      if (result.user) {
        setUser(result.user);
        const basePath = (result.user.role === 'doctor' || result.user.role === 'admin') ? '/doctor' : '/patient';
        navigate(`${basePath}/${result.user.id}/dashboard`, { replace: true });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const loginWithGoogle = useCallback(async (idToken: string): Promise<boolean> => {
    try {
      setLoading(true);
      const result = await authService.loginWithGoogle(idToken);
      if (result.user) {
        setUser(result.user);
        const basePath = (result.user.role === 'doctor' || result.user.role === 'admin') ? '/doctor' : '/patient';
        navigate(`${basePath}/${result.user.id}/dashboard`, { replace: true });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Google login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
      setUser(null);
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, [navigate]);

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
      }
    } catch (error) {
      console.error('Refresh user error:', error);
    }
  }, []);

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser(prev => {
      if (!prev) return prev;
      const updatedUser = { ...prev, ...updates };
      localStorage.setItem('izara_user', JSON.stringify(updatedUser));
      return updatedUser;
    });
  }, []);

  const contextValue = useMemo(() => ({
    user,
    loading,
    login,
    loginWithGoogle,
    logout,
    isAuthenticated: !!user,
    refreshUser,
    updateUser,
  }), [user, loading, login, loginWithGoogle, logout, refreshUser, updateUser]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Protected Route Component
interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: ('doctor' | 'patient' | 'admin')[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Save the attempted URL for redirecting after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role as any)) {
    // User doesn't have the required role
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default AuthProvider;
