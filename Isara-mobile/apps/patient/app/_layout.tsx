import { useEffect } from 'react';
import { Stack, SplashScreen } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/authStore';
import '../global.css';

// Prevent splash screen from hiding until we're ready
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime)
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

export default function RootLayout() {
  const { isAuthenticated, isLoading, initialize } = useAuthStore();

  useEffect(() => {
    async function prepare() {
      try {
        // Initialize auth state (check for stored tokens)
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
    return null; // splash screen is still visible
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
              name="appointment/[id]"
              options={{
                headerShown: true,
                title: 'รายละเอียดนัดหมาย',
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
              name="booking/index"
              options={{
                headerShown: true,
                title: 'นัดหมายแพทย์',
                presentation: 'modal',
              }}
            />
            <Stack.Screen
              name="health/vitals"
              options={{
                headerShown: true,
                title: 'สัญญาณชีพ',
              }}
            />
            <Stack.Screen
              name="health/medications"
              options={{
                headerShown: true,
                title: 'ยาของฉัน',
              }}
            />
            <Stack.Screen
              name="health/emr/[id]"
              options={{
                headerShown: true,
                title: 'บันทึกทางการแพทย์',
              }}
            />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
