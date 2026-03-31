import { Redirect, Stack } from 'expo-router';
import { useDoctorAuthStore } from '@/stores/authStore';

export default function AuthLayout() {
  const { isAuthenticated } = useDoctorAuthStore();

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen
        name="two-factor"
        options={{
          headerShown: true,
          title: 'ยืนยันตัวตน 2FA',
        }}
      />
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
