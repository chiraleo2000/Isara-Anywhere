import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';

export default function AuthLayout() {
  const { isAuthenticated } = useAuthStore();

  // If user is already authenticated, redirect to main app
  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
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
      <Stack.Screen
        name="otp-verify"
        options={{
          headerShown: true,
          title: 'ยืนยัน OTP',
        }}
      />
    </Stack>
  );
}
