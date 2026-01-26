/**
 * Authentication Provider - Manages auth state with React Router
 */
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { User, UserPreferences } from '../../types';
import { authService } from '../../services/authServices';

// Default user preferences
const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'light',
  language: 'th',
  notifications: {
    email: true,
    push: true,
    sms: false,
  },
};

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
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

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    setLoading(true);
    try {
      const currentUser = authService.getCurrentUser();
      const token = authService.getToken();

      if (currentUser && token) {
        // Verify session with server and sync admin privileges
        try {
          const response = await fetch('/auth/verify', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.valid && data.user) {
              // Sync admin privileges from server (in case they changed)
              const syncedUser = {
                ...currentUser,
                isAdmin: data.user.isAdmin || false,
                adminPrivileges: data.user.adminPrivileges || undefined,
              };
              
              // Update localStorage with synced data
              localStorage.setItem('izara_current_user', JSON.stringify(syncedUser));
              setUser(syncedUser);
              
              console.log('✅ Session restored and synced:', syncedUser.email);
              if (syncedUser.isAdmin) {
                console.log('👑 Admin privileges active:', JSON.stringify(syncedUser.adminPrivileges));
              }
            } else {
              // Session invalid on server
              console.log('⚠️ Session invalid on server, logging out');
              authService.logout();
              setUser(null);
              navigate('/login', { replace: true });
              return;
            }
          } else {
            // Server verification failed, use cached user
            console.log('⚠️ Could not verify session, using cached user');
            setUser(currentUser);
          }
        } catch (verifyError) {
          // Network error, use cached user
          console.warn('⚠️ Session verification failed, using cached user:', verifyError);
          setUser(currentUser);
        }
        
        // Redirect to appropriate dashboard if on login page
        if (location.pathname === '/login' || location.pathname === '/') {
          // Admin and doctor both use the doctor portal
          const basePath = (currentUser.role === 'doctor' || currentUser.role === 'admin') ? '/doctor' : '/patient';
          navigate(`${basePath}/${currentUser.id}/dashboard`, { replace: true });
        }
      } else {
        setUser(null);
        // Redirect to login if not on public routes
        if (!location.pathname.startsWith('/login')) {
          navigate('/login', { replace: true });
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      const result = await authService.login({ email, password });
      
      if (result.user) {
        setUser(result.user);
        
        // Navigate to appropriate portal based on role
        // Admin and doctor both use the doctor portal
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
  };

  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const refreshUser = async () => {
    try {
      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
      }
    } catch (error) {
      console.error('Refresh user error:', error);
    }
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      // Also update localStorage
      localStorage.setItem('izara_user', JSON.stringify(updatedUser));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
        refreshUser,
        updateUser,
      }}
    >
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
