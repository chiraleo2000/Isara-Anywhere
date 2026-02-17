/**
 * Doctor Tabs Layout — 5-tab bottom navigation
 * Tabs: Home, Schedule, Patients, Queue, Profile
 * Theme: Dark blue (#1e40af)
 */

import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { TabBarIcon } from '../../../../src/components/navigation/TabBarIcon';

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
          tabBarIcon: ({ color, size }) => <TabBarIcon name="grid" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'ตารางนัด',
          headerTitle: 'ตารางนัดหมาย',
          tabBarIcon: ({ color, size }) => <TabBarIcon name="calendar" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="patients"
        options={{
          title: 'ผู้ป่วย',
          headerTitle: 'รายชื่อผู้ป่วย',
          tabBarIcon: ({ color, size }) => <TabBarIcon name="people" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="queue"
        options={{
          title: 'คิว',
          headerTitle: 'จัดการคิว',
          tabBarIcon: ({ color, size }) => <TabBarIcon name="list" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'โปรไฟล์',
          headerTitle: 'โปรไฟล์แพทย์',
          tabBarIcon: ({ color, size }) => <TabBarIcon name="person" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
