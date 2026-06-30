import { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback, useMemo } from 'react';
import { User } from '../types';
import { resolveApiBaseUrl } from '../utils/resolveApiBaseUrl';
import { getDemoPatientCredentials, isDemoAutoLoginEnabled, shouldSkipDemoAutoLogin } from '../utils/demoAutoAuth';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  register: (data: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

interface RegisterInput {
  // Basic Info
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  // Health Info (optional)
  height?: number;
  weight?: number;
  bloodType?: string;
  allergies?: string;
  chronicConditions?: string;
  currentMedications?: string;
  // Emergency Contact (optional)
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Inactivity timeout: 3 hours
const INACTIVITY_TIMEOUT = 3 * 60 * 60 * 1000;
const INACTIVITY_CHECK_INTERVAL = 60 * 1000; // Check every minute

// Device fingerprinting for session isolation
function generateDeviceId(): string {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 'unknown',
  ];

  const fingerprint = components.join('|');
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.codePointAt(i) ?? 0;
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'pat_dev_' + Math.abs(hash).toString(36) + '_' + Date.now().toString(36);
}

function getDeviceId(): string {
  let deviceId = localStorage.getItem('izara_patient_device_id');
  if (!deviceId) {
    deviceId = generateDeviceId();
    localStorage.setItem('izara_patient_device_id', deviceId);
  }
  return deviceId;
}

// Use relative paths for API calls - Vite proxy will forward /api to backend
// This works in both development (via proxy) and production (same origin)
const getApiUrl = (path: string) => `${resolveApiBaseUrl()}${path}`;

export function AuthProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  const demoAutoLoginAttempted = useRef(false);

  // Update last activity timestamp
  const updateActivity = useCallback(() => {
    const now = Date.now();
    setLastActivity(now);
    localStorage.setItem('izara_patient_last_activity', now.toString());
  }, []);

  // Check if inactive for 15 minutes
  const isInactive = useCallback(() => {
    const stored = localStorage.getItem('izara_patient_last_activity');
    const lastActiveTime = stored ? Number.parseInt(stored, 10) : lastActivity;
    return (Date.now() - lastActiveTime) > INACTIVITY_TIMEOUT;
  }, [lastActivity]);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  // Track user activity for inactivity timeout
  useEffect(() => {
    if (!user) return;

    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    activityEvents.forEach(event => {
      globalThis.addEventListener(event, updateActivity, { passive: true });
    });

    // Check for inactivity every minute
    const inactivityInterval = setInterval(() => {
      if (user && isInactive()) {
        console.log('⚠️ Session expired due to 15 minutes of inactivity');
        clearAuth();
        globalThis.location.href = '/login?reason=inactivity';
      }
    }, INACTIVITY_CHECK_INTERVAL);

    return () => {
      activityEvents.forEach(event => {
        globalThis.removeEventListener(event, updateActivity);
      });
      clearInterval(inactivityInterval);
    };
  }, [user, updateActivity, isInactive]);

  const loadStoredAuth = () => {
    try {
      const storedUser = localStorage.getItem('izara_user');
      const storedToken = localStorage.getItem('auth_token');

      // Check if session has expired due to inactivity
      const lastActivityStored = localStorage.getItem('izara_patient_last_activity');
      if (lastActivityStored && (Date.now() - Number.parseInt(lastActivityStored, 10)) > INACTIVITY_TIMEOUT) {
        console.log('⚠️ Session expired - clearing stored auth');
        clearAuth();
        return;
      }

      if (storedUser && storedToken) {
        setUser(JSON.parse(storedUser));
        setToken(storedToken);
        updateActivity();
      }
    } catch (error) {
      console.error('Failed to load stored auth:', error);
      clearAuth();
    } finally {
      setIsLoading(false);
    }
  };

  const saveAuth = (user: User, token: string) => {
    localStorage.setItem('izara_user', JSON.stringify(user));
    localStorage.setItem('auth_token', token);
    setUser(user);
    setToken(token);
    updateActivity();
  };

  const clearAuth = () => {
    localStorage.removeItem('izara_user');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('izara_patient_last_activity');
    setUser(null);
    setToken(null);
  };

  const login = async (email: string, password: string) => {
    const deviceId = getDeviceId();

    const res = await fetch(getApiUrl('/api/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        deviceId,
        userAgent: navigator.userAgent
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Login failed');
    }
    const data = await res.json();
    saveAuth(data.user, data.token);
  };

  // Docker/E2E: silent demo patient login — no manual click on /login
  useEffect(() => {
    if (!isDemoAutoLoginEnabled() || user || isLoading || demoAutoLoginAttempted.current) return;
    if (shouldSkipDemoAutoLogin()) return;
    demoAutoLoginAttempted.current = true;
    const creds = getDemoPatientCredentials();
    login(creds.email, creds.password).catch((err) => {
      console.warn('[Auth] Demo auto-login failed:', err);
      demoAutoLoginAttempted.current = false;
    });
  }, [user, isLoading]);

  const loginWithGoogle = async (idToken: string) => {
    const res = await fetch(getApiUrl('/api/auth/google-auth'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, portal: 'patient' }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const e = new Error(err.message || err.error || 'Google sign-in failed') as Error & { code?: string; email?: string; userId?: string };
      e.code = err.code || err.error;
      e.email = err.email;
      e.userId = err.userId;
      throw e;
    }
    const data = await res.json();
    saveAuth(data.user, data.token);
  };

  const register = async (input: RegisterInput) => {
    const res = await fetch(getApiUrl('/api/auth/register'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Registration failed');
    }
    // Do not auto-login — user must sign in on the login page after registration
  };

  const logout = async () => {
    if (token) {
      await fetch(getApiUrl('/api/auth/logout'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      }).catch(() => { });
    }
    clearAuth();
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('izara_user', JSON.stringify(updatedUser));
    updateActivity();
  };

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    user,
    token,
    isLoading,
    isAuthenticated: !!user && !!token,
    login,
    loginWithGoogle,
    register,
    logout,
    updateUser,
  }), [user, token, isLoading, login, register]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
