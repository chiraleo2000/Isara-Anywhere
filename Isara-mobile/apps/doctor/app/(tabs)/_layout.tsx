import { Redirect, Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useDoctorAuthStore } from '@/stores/authStore';
import { TabBarIcon } from '@/components/navigation/TabBarIcon';

const renderGridIcon = ({ color, size }: { color: string; size: number }) => (
  <TabBarIcon name="grid" color={color} size={size} />
);
const renderCalendarIcon = ({ color, size }: { color: string; size: number }) => (
  <TabBarIcon name="calendar" color={color} size={size} />
);
const renderPeopleIcon = ({ color, size }: { color: string; size: number }) => (
  <TabBarIcon name="people" color={color} size={size} />
);
const renderListIcon = ({ color, size }: { color: string; size: number }) => (
  <TabBarIcon name="list" color={color} size={size} />
);
const renderPersonIcon = ({ color, size }: { color: string; size: number }) => (
  <TabBarIcon name="person" color={color} size={size} />
);

export default function TabLayout() {
  const { isAuthenticated } = useDoctorAuthStore();

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

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
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: '#1e40af',
        },
        headerTintColor: '#ffffff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'หน้าหลัก',
          headerTitle: 'Izara Doctor',
          tabBarIcon: renderGridIcon,
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'ตารางนัด',
          headerTitle: 'ตารางนัดหมาย',
          tabBarIcon: renderCalendarIcon,
        }}
      />
      <Tabs.Screen
        name="patients"
        options={{
          title: 'ผู้ป่วย',
          headerTitle: 'รายชื่อผู้ป่วย',
          tabBarIcon: renderPeopleIcon,
        }}
      />
      <Tabs.Screen
        name="queue"
        options={{
          title: 'คิว',
          headerTitle: 'จัดการคิว',
          tabBarIcon: renderListIcon,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'โปรไฟล์',
          headerTitle: 'โปรไฟล์แพทย์',
          tabBarIcon: renderPersonIcon,
        }}
      />
    </Tabs>
  );
}
