/**
 * Izara Anywhere — Unified Mobile App
 * Root Layout: Wraps entire app with providers
 * 
 * @version 2.0.0
 */

import { useEffect } from 'react';
import { Stack, SplashScreen } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { initPatientApi, initDoctorApi } from '@izara/api-client';
import { useAuthStore } from '../src/stores/authStore';
import '../global.css';

SplashScreen.preventAutoHideAsync();

// ── Initialize API clients from Expo config ──
const extra = Constants.expoConfig?.extra ?? {};

const patientBaseURL = extra.PATIENT_API_URL ?? 'http://localhost:3005';
const doctorApiPort = extra.DOCTOR_API_PORT ?? '3009';
const doctorAuthPort = extra.DOCTOR_AUTH_PORT ?? '3011';
const doctorGcsPort = extra.DOCTOR_GCS_PORT ?? '3012';

// In production (Cloud Run), all doctor endpoints go through the same URL.
// In dev, they run on separate localhost ports.
const isDoctorCloudRun = (extra.DOCTOR_API_URL ?? '').startsWith('https://');
const doctorApiBase = isDoctorCloudRun
  ? extra.DOCTOR_API_URL
  : `http://localhost:${doctorApiPort}`;
const doctorAuthBase = isDoctorCloudRun
  ? extra.DOCTOR_API_URL
  : `http://localhost:${doctorAuthPort}`;
const doctorGcsBase = isDoctorCloudRun
  ? extra.DOCTOR_API_URL
  : `http://localhost:${doctorGcsPort}`;

initPatientApi({ baseURL: patientBaseURL });
initDoctorApi({
  apiBaseURL: doctorApiBase,
  authBaseURL: doctorAuthBase,
  gcsBaseURL: doctorGcsBase,
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: { retry: 1 },
  },
});

export default function RootLayout() {
  const { isLoading, initialize } = useAuthStore();

  useEffect(() => {
    async function prepare() {
      try {
        await initialize();
      } catch (error) {
        console.error('Failed to initialize auth:', error);
      } finally {
        await SplashScreen.hideAsync();
      }
    }
    prepare();
  }, []);

  if (isLoading) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="auto" />
          <Stack screenOptions={{ headerShown: false }}>
            {/* Role Selection / Landing */}
            <Stack.Screen name="index" />

            {/* Auth screens (shared) */}
            <Stack.Screen name="(auth)" />

            {/* Patient route group */}
            <Stack.Screen name="(patient)" />

            {/* Doctor route group */}
            <Stack.Screen name="(doctor)" />

            {/* Shared modal screens */}
            <Stack.Screen
              name="meeting/[id]"
              options={{ presentation: 'fullScreenModal', gestureEnabled: false }}
            />
            <Stack.Screen
              name="settings/index"
              options={{ headerShown: true, title: 'ตั้งค่า', presentation: 'card' }}
            />
            <Stack.Screen
              name="settings/notifications"
              options={{ headerShown: true, title: 'การแจ้งเตือน', presentation: 'card' }}
            />
            <Stack.Screen
              name="settings/connections"
              options={{ headerShown: true, title: 'การเชื่อมต่อ API', presentation: 'card' }}
            />
            <Stack.Screen
              name="settings/privacy"
              options={{ headerShown: true, title: 'ความเป็นส่วนตัว', presentation: 'card' }}
            />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
