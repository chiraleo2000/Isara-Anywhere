/**
 * Doctor Route Group Layout
 * Stack navigator wrapping doctor tabs and sub-screens
 */

import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '../../src/stores/authStore';

export default function DoctorGroupLayout() {
  const { isAuthenticated, activeRole } = useAuthStore();

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  if (activeRole === 'patient') {
    return <Redirect href="/(patient)/(tabs)" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="patient/[id]"
        options={{ headerShown: true, title: 'ข้อมูลผู้ป่วย' }}
      />
      <Stack.Screen
        name="emr/create/[appointmentId]"
        options={{ headerShown: true, title: 'สร้างเวชระเบียน' }}
      />
      <Stack.Screen
        name="emr/[id]"
        options={{ headerShown: true, title: 'เวชระเบียน' }}
      />
      <Stack.Screen
        name="prescription/[appointmentId]"
        options={{ headerShown: true, title: 'สั่งยา', presentation: 'modal' }}
      />
      <Stack.Screen
        name="notifications"
        options={{ headerShown: true, title: 'การแจ้งเตือน' }}
      />
    </Stack>
  );
}
