/**
 * Auth Layout — Redirect authenticated users to their role's tab group
 */

import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '../../src/stores/authStore';

export default function AuthLayout() {
  const { isAuthenticated, activeRole } = useAuthStore();

  if (isAuthenticated) {
    return <Redirect href={activeRole === 'doctor' ? '/(doctor)/(tabs)' : '/(patient)/(tabs)'} />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen
        name="forgot-password"
        options={{
          headerShown: true,
          title: 'ลืมรหัสผ่าน',
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}
