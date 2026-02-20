import { useEffect } from 'react';
import { Stack, SplashScreen } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useDoctorAuthStore } from '@/stores/authStore';
import '../global.css';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000, // 2 minutes (doctors need fresher data)
      gcTime: 15 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

export default function RootLayout() {
  const { isLoading, initialize } = useDoctorAuthStore();

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

  if (isLoading) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="auto" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="patient/[id]"
              options={{
                headerShown: true,
                title: 'ข้อมูลผู้ป่วย',
                presentation: 'card',
              }}
            />
            <Stack.Screen
              name="emr/create/[appointmentId]"
              options={{
                headerShown: true,
                title: 'สร้าง EMR',
                presentation: 'card',
              }}
            />
            <Stack.Screen
              name="emr/[id]"
              options={{
                headerShown: true,
                title: 'บันทึกทางการแพทย์',
                presentation: 'card',
              }}
            />
            <Stack.Screen
              name="meeting/[id]"
              options={{
                presentation: 'fullScreenModal',
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="prescription/[appointmentId]"
              options={{
                headerShown: true,
                title: 'สั่งยา',
                presentation: 'modal',
              }}
            />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
