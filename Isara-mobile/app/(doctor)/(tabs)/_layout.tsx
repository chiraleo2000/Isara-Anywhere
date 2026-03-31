/**
 * Doctor Tabs Layout — 5-tab bottom navigation
 * Tabs: Home, Schedule, Patients, Queue, Profile
 * Theme: Dark blue (#1e40af)
 */

import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { TabBarIcon } from '../../../src/components/navigation/TabBarIcon';

/** Extracted tab bar icon renderers to satisfy react/no-unstable-nested-components */
const HomeIcon = ({ color, size }: { color: string; size: number }) => (
  <TabBarIcon name="grid" color={color} size={size} />
);
const ScheduleIcon = ({ color, size }: { color: string; size: number }) => (
  <TabBarIcon name="calendar" color={color} size={size} />
);
const PatientsIcon = ({ color, size }: { color: string; size: number }) => (
  <TabBarIcon name="people" color={color} size={size} />
);
const QueueIcon = ({ color, size }: { color: string; size: number }) => (
  <TabBarIcon name="list" color={color} size={size} />
);
const ProfileIcon = ({ color, size }: { color: string; size: number }) => (
  <TabBarIcon name="person" color={color} size={size} />
);

export default function DoctorTabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#1e40af',
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
        headerStyle: { backgroundColor: '#1e40af' },
        headerTintColor: '#ffffff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'หน้าหลัก',
          headerTitle: 'Izara Doctor',
          tabBarIcon: HomeIcon,
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'ตารางนัด',
          headerTitle: 'ตารางนัดหมาย',
          tabBarIcon: ScheduleIcon,
        }}
      />
      <Tabs.Screen
        name="patients"
        options={{
          title: 'ผู้ป่วย',
          headerTitle: 'รายชื่อผู้ป่วย',
          tabBarIcon: PatientsIcon,
        }}
      />
      <Tabs.Screen
        name="queue"
        options={{
          title: 'คิว',
          headerTitle: 'จัดการคิว',
          tabBarIcon: QueueIcon,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'โปรไฟล์',
          headerTitle: 'โปรไฟล์แพทย์',
          tabBarIcon: ProfileIcon,
        }}
      />
    </Tabs>
  );
}
