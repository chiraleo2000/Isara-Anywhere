import { useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import * as authService from '../services/simpleAuth';

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

  useEffect(() => {
    checkAuth();

    const refreshInterval = setInterval(() => {
      refreshSession();
    }, 5 * 60 * 1000);

    return () => clearInterval(refreshInterval);
  }, [checkAuth, refreshSession]);

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
