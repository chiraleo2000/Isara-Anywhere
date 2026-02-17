/**
 * Izara Anywhere — Unified Auth Store
 * Supports both Patient and Doctor roles with role switching
 * Phase 2: Dual-role authentication with biometric support
 */

import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { patientApi, doctorApi } from '@izara/api-client';

// ─── Types ───────────────────────────────────────────────────────────

export type UserRole = 'patient' | 'doctor';

export interface PatientUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  avatar_url?: string;
  date_of_birth?: string;
  gender?: string;
  blood_type?: string;
  allergies?: string[];
  national_id?: string;
  role: 'patient';
}

export interface DoctorUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  avatar_url?: string;
  prefix?: string;
  specialty?: string;
  license_number?: string;
  hospital?: string;
  department?: string;
  role: 'doctor';
}

export type User = PatientUser | DoctorUser;

interface RegisterData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone: string;
  date_of_birth?: string;
  gender?: string;
  national_id?: string;
  // Doctor-specific
  prefix?: string;
  specialty?: string;
  license_number?: string;
}

// ─── Store Interface ─────────────────────────────────────────────────

interface AuthState {
  // State
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  activeRole: UserRole;
  lastActiveRole: UserRole | null;
  hasBiometricCredentials: boolean;
  onboardingCompleted: boolean;

  // Actions
  initialize: () => Promise<void>;
  setActiveRole: (role: UserRole) => void;
  login: (email: string, password: string) => Promise<void>;
  loginWithBiometric: () => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  updateProfile: (data: Partial<User>) => void;
  setTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  switchRole: (role: UserRole) => Promise<void>;
  completeOnboarding: () => Promise<void>;
}

// ─── Secure Storage Keys ─────────────────────────────────────────────

const KEYS = {
  ACCESS_TOKEN: 'izara_access_token',
  REFRESH_TOKEN: 'izara_refresh_token',
  USER_DATA: 'izara_user_data',
  BIOMETRIC_ENABLED: 'izara_biometric_enabled',
  BIOMETRIC_CREDENTIALS: 'izara_biometric_creds',
  ACTIVE_ROLE: 'izara_active_role',
  ONBOARDING_DONE: 'izara_onboarding_done',
};

// ─── Helper ──────────────────────────────────────────────────────────

function getApiForRole(role: UserRole) {
  return role === 'doctor' ? doctorApi : patientApi;
}

// ─── Store ───────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,
  activeRole: 'patient',
  lastActiveRole: null,
  hasBiometricCredentials: false,
  onboardingCompleted: false,

  initialize: async () => {
    try {
      const [accessToken, refreshToken, userData, biometricEnabled, savedRole, onboarding] =
        await Promise.all([
          SecureStore.getItemAsync(KEYS.ACCESS_TOKEN),
          SecureStore.getItemAsync(KEYS.REFRESH_TOKEN),
          SecureStore.getItemAsync(KEYS.USER_DATA),
          SecureStore.getItemAsync(KEYS.BIOMETRIC_ENABLED),
          SecureStore.getItemAsync(KEYS.ACTIVE_ROLE),
          SecureStore.getItemAsync(KEYS.ONBOARDING_DONE),
        ]);

      const lastActiveRole = (savedRole as UserRole) || null;
      const activeRole = lastActiveRole || 'patient';

      if (accessToken && refreshToken && userData) {
        const user = JSON.parse(userData) as User;
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          activeRole,
          lastActiveRole,
          hasBiometricCredentials: biometricEnabled === 'true',
          onboardingCompleted: onboarding === 'true',
        });

        // Verify token validity
        try {
          const api = getApiForRole(activeRole);
          const profile = await api.getProfile(accessToken);
          set({ user: { ...profile, role: activeRole } });
        } catch {
          await get().refreshAuth();
        }
      } else {
        set({
          activeRole,
          lastActiveRole,
          hasBiometricCredentials: biometricEnabled === 'true',
          onboardingCompleted: onboarding === 'true',
        });
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  setActiveRole: (role: UserRole) => {
    set({ activeRole: role });
    SecureStore.setItemAsync(KEYS.ACTIVE_ROLE, role);
  },

  login: async (email: string, password: string) => {
    const role = get().activeRole;
    const api = getApiForRole(role);

    const response = await api.login(email, password);
    const { access_token, refresh_token, user } = response;

    await get().setTokens(access_token, refresh_token);
    const userData = { ...user, role };
    await SecureStore.setItemAsync(KEYS.USER_DATA, JSON.stringify(userData));
    await SecureStore.setItemAsync(KEYS.ACTIVE_ROLE, role);

    set({
      user: userData,
      accessToken: access_token,
      refreshToken: refresh_token,
      isAuthenticated: true,
      lastActiveRole: role,
    });
  },

  loginWithBiometric: async () => {
    const credentials = await SecureStore.getItemAsync(KEYS.BIOMETRIC_CREDENTIALS);
    if (!credentials) throw new Error('No biometric credentials found');

    const { email, token, role: savedRole } = JSON.parse(credentials);
    const role = savedRole || get().activeRole;
    const api = getApiForRole(role);

    const response = await api.loginWithBiometric(email, token);
    const { access_token, refresh_token, user } = response;

    await get().setTokens(access_token, refresh_token);
    const userData = { ...user, role };
    await SecureStore.setItemAsync(KEYS.USER_DATA, JSON.stringify(userData));

    set({
      user: userData,
      accessToken: access_token,
      refreshToken: refresh_token,
      isAuthenticated: true,
      activeRole: role,
      lastActiveRole: role,
    });
  },

  register: async (data: RegisterData) => {
    const role = get().activeRole;
    const api = getApiForRole(role);

    const response = await api.register(data);
    const { access_token, refresh_token, user } = response;

    await get().setTokens(access_token, refresh_token);
    const userData = { ...user, role };
    await SecureStore.setItemAsync(KEYS.USER_DATA, JSON.stringify(userData));

    set({
      user: userData,
      accessToken: access_token,
      refreshToken: refresh_token,
      isAuthenticated: true,
      lastActiveRole: role,
    });
  },

  logout: async () => {
    try {
      const token = get().accessToken;
      const role = get().activeRole;
      if (token) {
        await getApiForRole(role).logout(token);
      }
    } catch {
      // Ignore logout API errors
    }

    await Promise.all([
      SecureStore.deleteItemAsync(KEYS.ACCESS_TOKEN),
      SecureStore.deleteItemAsync(KEYS.REFRESH_TOKEN),
      SecureStore.deleteItemAsync(KEYS.USER_DATA),
    ]);

    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  },

  refreshAuth: async () => {
    const refreshToken = get().refreshToken;
    if (!refreshToken) {
      await get().logout();
      return;
    }

    try {
      const role = get().activeRole;
      const response = await getApiForRole(role).refreshToken(refreshToken);
      const { access_token, refresh_token } = response;
      await get().setTokens(access_token, refresh_token);
      set({ accessToken: access_token, refreshToken: refresh_token });
    } catch {
      await get().logout();
    }
  },

  updateProfile: (data: Partial<User>) => {
    const currentUser = get().user;
    if (currentUser) {
      const updatedUser = { ...currentUser, ...data } as User;
      set({ user: updatedUser });
      SecureStore.setItemAsync(KEYS.USER_DATA, JSON.stringify(updatedUser));
    }
  },

  setTokens: async (accessToken: string, refreshToken: string) => {
    await Promise.all([
      SecureStore.setItemAsync(KEYS.ACCESS_TOKEN, accessToken),
      SecureStore.setItemAsync(KEYS.REFRESH_TOKEN, refreshToken),
    ]);
  },

  switchRole: async (role: UserRole) => {
    // Logout current session then set new role
    await get().logout();
    set({ activeRole: role, lastActiveRole: role });
    await SecureStore.setItemAsync(KEYS.ACTIVE_ROLE, role);
  },

  completeOnboarding: async () => {
    await SecureStore.setItemAsync(KEYS.ONBOARDING_DONE, 'true');
    set({ onboardingCompleted: true });
  },
}));
