/**
 * Izara Doctor — Auth Store
 * Doctor-specific authentication with Zustand + Expo SecureStore
 */

import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { doctorApi } from '@izara/api-client';

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

interface DoctorAuthState {
  user: DoctorUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasBiometricCredentials: boolean;

  // Actions
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithBiometric: () => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  updateProfile: (data: Partial<DoctorUser>) => void;
  setTokens: (accessToken: string, refreshToken: string) => Promise<void>;
}

const SECURE_KEYS = {
  ACCESS_TOKEN: 'izara_doctor_access_token',
  REFRESH_TOKEN: 'izara_doctor_refresh_token',
  USER_DATA: 'izara_doctor_user_data',
  BIOMETRIC_ENABLED: 'izara_doctor_biometric_enabled',
  BIOMETRIC_CREDENTIALS: 'izara_doctor_biometric_creds',
};

export const useDoctorAuthStore = create<DoctorAuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,
  hasBiometricCredentials: false,

  initialize: async () => {
    try {
      const accessToken = await SecureStore.getItemAsync(SECURE_KEYS.ACCESS_TOKEN);
      const refreshToken = await SecureStore.getItemAsync(SECURE_KEYS.REFRESH_TOKEN);
      const userData = await SecureStore.getItemAsync(SECURE_KEYS.USER_DATA);
      const biometricEnabled = await SecureStore.getItemAsync(SECURE_KEYS.BIOMETRIC_ENABLED);

      if (accessToken && refreshToken && userData) {
        const user = JSON.parse(userData);
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          hasBiometricCredentials: biometricEnabled === 'true',
        });

        // Verify token is still valid
        try {
          const profile = await doctorApi.getProfile(accessToken);
          set({ user: profile });
        } catch {
          // Token expired, try refresh
          await get().refreshAuth();
        }
      } else {
        set({
          hasBiometricCredentials: biometricEnabled === 'true',
        });
      }
    } catch (error) {
      console.error('Doctor auth initialization error:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (email: string, password: string) => {
    const response = await doctorApi.login(email, password);
    const { access_token, refresh_token, user } = response;

    await get().setTokens(access_token, refresh_token);
    await SecureStore.setItemAsync(SECURE_KEYS.USER_DATA, JSON.stringify(user));

    set({
      user,
      accessToken: access_token,
      refreshToken: refresh_token,
      isAuthenticated: true,
    });
  },

  loginWithBiometric: async () => {
    const credentials = await SecureStore.getItemAsync(SECURE_KEYS.BIOMETRIC_CREDENTIALS);
    if (!credentials) {
      throw new Error('No biometric credentials found');
    }

    const { email, token } = JSON.parse(credentials);
    const response = await doctorApi.loginWithBiometric(email, token);
    const { access_token, refresh_token, user } = response;

    await get().setTokens(access_token, refresh_token);
    await SecureStore.setItemAsync(SECURE_KEYS.USER_DATA, JSON.stringify(user));

    set({
      user,
      accessToken: access_token,
      refreshToken: refresh_token,
      isAuthenticated: true,
    });
  },

  logout: async () => {
    try {
      const token = get().accessToken;
      if (token) {
        await doctorApi.logout(token);
      }
    } catch {
      // Ignore logout API errors
    }

    await SecureStore.deleteItemAsync(SECURE_KEYS.ACCESS_TOKEN);
    await SecureStore.deleteItemAsync(SECURE_KEYS.REFRESH_TOKEN);
    await SecureStore.deleteItemAsync(SECURE_KEYS.USER_DATA);

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
      const response = await doctorApi.refreshToken(refreshToken);
      const { access_token, refresh_token } = response;

      await get().setTokens(access_token, refresh_token);

      set({
        accessToken: access_token,
        refreshToken: refresh_token,
      });
    } catch {
      await get().logout();
    }
  },

  updateProfile: (data: Partial<DoctorUser>) => {
    const currentUser = get().user;
    if (currentUser) {
      const updatedUser = { ...currentUser, ...data };
      set({ user: updatedUser });
      SecureStore.setItemAsync(SECURE_KEYS.USER_DATA, JSON.stringify(updatedUser));
    }
  },

  setTokens: async (accessToken: string, refreshToken: string) => {
    await SecureStore.setItemAsync(SECURE_KEYS.ACCESS_TOKEN, accessToken);
    await SecureStore.setItemAsync(SECURE_KEYS.REFRESH_TOKEN, refreshToken);
  },
}));
