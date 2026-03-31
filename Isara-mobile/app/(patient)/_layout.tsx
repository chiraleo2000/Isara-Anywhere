/**
 * Patient Route Group Layout
 * Stack navigator wrapping the patient tabs and sub-screens
 */

import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '../../src/stores/authStore';

export default function PatientGroupLayout() {
  const { isAuthenticated, activeRole } = useAuthStore();

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  // If user switched to doctor, redirect
  if (activeRole === 'doctor') {
    return <Redirect href="/(doctor)/(tabs)" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="appointment/[id]"
        options={{ headerShown: true, title: 'รายละเอียดนัดหมาย' }}
      />
      <Stack.Screen
        name="booking"
        options={{ headerShown: true, title: 'นัดหมายแพทย์', presentation: 'modal' }}
      />
      <Stack.Screen
        name="health/vitals"
        options={{ headerShown: true, title: 'สัญญาณชีพ' }}
      />
      <Stack.Screen
        name="health/medications"
        options={{ headerShown: true, title: 'ยาของฉัน' }}
      />
      <Stack.Screen
        name="health/emr/[id]"
        options={{ headerShown: true, title: 'เวชระเบียน' }}
      />
      <Stack.Screen
        name="notifications"
        options={{ headerShown: true, title: 'การแจ้งเตือน' }}
      />
    </Stack>
  );
}
