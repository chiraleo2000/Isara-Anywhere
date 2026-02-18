/**
 * Patient Tabs Layout — 5-tab bottom navigation
 * Tabs: Home, Appointments, Health, AI Chat, Profile
 * Theme: Sky blue (#0ea5e9)
 */

import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { TabBarIcon } from '../../../src/components/navigation/TabBarIcon';

/** Extracted tab bar icon renderers to satisfy react/no-unstable-nested-components */
const HomeIcon = ({ color, size }: { color: string; size: number }) => (
  <TabBarIcon name="home" color={color} size={size} />
);
const AppointmentsIcon = ({ color, size }: { color: string; size: number }) => (
  <TabBarIcon name="calendar" color={color} size={size} />
);
const HealthIcon = ({ color, size }: { color: string; size: number }) => (
  <TabBarIcon name="heart" color={color} size={size} />
);
const AiChatIcon = ({ color, size }: { color: string; size: number }) => (
  <TabBarIcon name="chatbubble-ellipses" color={color} size={size} />
);
const ProfileIcon = ({ color, size }: { color: string; size: number }) => (
  <TabBarIcon name="person" color={color} size={size} />
);

export default function PatientTabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#0ea5e9',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          backgroundColor: '#ffffff',
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        headerStyle: { backgroundColor: '#0ea5e9' },
        headerTintColor: '#ffffff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'หน้าหลัก',
          headerTitle: 'Izara Patient',
          tabBarIcon: HomeIcon,
        }}
      />
      <Tabs.Screen
        name="appointments"
        options={{
          title: 'นัดหมาย',
          headerTitle: 'นัดหมายของฉัน',
          tabBarIcon: AppointmentsIcon,
        }}
      />
      <Tabs.Screen
        name="health"
        options={{
          title: 'สุขภาพ',
          headerTitle: 'ข้อมูลสุขภาพ',
          tabBarIcon: HealthIcon,
        }}
      />
      <Tabs.Screen
        name="ai-chat"
        options={{
          title: 'AI แพทย์',
          headerTitle: 'ปรึกษา AI',
          tabBarIcon: AiChatIcon,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'โปรไฟล์',
          headerTitle: 'โปรไฟล์ของฉัน',
          tabBarIcon: ProfileIcon,
        }}
      />
    </Tabs>
  );
}
