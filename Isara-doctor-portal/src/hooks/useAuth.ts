import { useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import * as authService from '../services/simpleAuth';

// Inactivity timeout: 3 hours
const INACTIVITY_CHECK_INTERVAL = 60 * 1000; // Check every minute

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkAuth = useCallback(async () => {
    try {
      setLoading(true);
      const currentUser = authService.getCurrentUser();
      setUser(currentUser);
    } catch (err: any) {
      setError(err.message);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      const result = await authService.login({ email, password });
      setUser(result.user);
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
      setUser(null);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  const refreshSession = useCallback(() => {
    authService.refreshSession();
  }, []);

  // Track user activity for inactivity timeout
  const handleUserActivity = useCallback(() => {
    if (user) {
      authService.refreshSession();
    }
  }, [user]);

  useEffect(() => {
    checkAuth();

    // Refresh session every 5 minutes
    const refreshInterval = setInterval(() => {
      refreshSession();
    }, 5 * 60 * 1000);

    // Check for inactivity every minute
    const inactivityInterval = setInterval(() => {
      if (user && authService.checkInactivityTimeout) {
        const isStillValid = authService.checkInactivityTimeout();
        if (!isStillValid) {
          setUser(null);
          globalThis.location.href = '/login?reason=inactivity';
        }
      }
    }, INACTIVITY_CHECK_INTERVAL);

    // Track user activity events
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    activityEvents.forEach(event => {
      globalThis.addEventListener(event, handleUserActivity, { passive: true });
    });

    return () => {
      clearInterval(refreshInterval);
      clearInterval(inactivityInterval);
      activityEvents.forEach(event => {
        globalThis.removeEventListener(event, handleUserActivity);
      });
    };
  }, [checkAuth, refreshSession, handleUserActivity, user]);

  return {
    user,
    loading,
    error,
    login,
    logout,
    refreshSession,
    isAuthenticated: !!user,
  };
}
