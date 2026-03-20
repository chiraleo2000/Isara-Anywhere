import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { DoctorHomeScreen } from '../screens/doctor/DoctorHomeScreen';
import { QueueScreen } from '../screens/doctor/QueueScreen';
import { PatientsScreen } from '../screens/doctor/PatientsScreen';
import { NotificationsScreen } from '../screens/shared/NotificationsScreen';
import { DoctorProfileScreen } from '../screens/doctor/DoctorProfileScreen';

export type DoctorTabParamList = {
  DoctorHome: undefined;
  Queue: undefined;
  Patients: undefined;
  DoctorNotifications: undefined;
  DoctorProfile: undefined;
};

const Tab = createBottomTabNavigator<DoctorTabParamList>();

function getTabIcon(routeName: string, focused: boolean): string {
  const icons: Record<string, string> = {
    DoctorHome: focused ? '🏠' : '🏡',
    Queue: focused ? '📋' : '📄',
    Patients: focused ? '🩺' : '👥',
    DoctorNotifications: focused ? '🔔' : '🔕',
    DoctorProfile: focused ? '👤' : '👥',
  };
  return icons[routeName] ?? '•';
}

function renderTabIcon(routeName: string, focused: boolean): React.ReactNode {
  const icon = getTabIcon(routeName, focused);
  return <Text style={{ fontSize: 22 }}>{icon}</Text>;
}

export function DoctorNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => renderTabIcon(route.name, focused),
        tabBarActiveTintColor: '#047857',
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#e2e8f0',
          paddingBottom: 4,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen name="DoctorHome" component={DoctorHomeScreen} options={{ title: 'Dashboard' }} />
      <Tab.Screen name="Queue" component={QueueScreen} options={{ title: 'Queue' }} />
      <Tab.Screen name="Patients" component={PatientsScreen} options={{ title: 'Patients' }} />
      <Tab.Screen name="DoctorNotifications" component={NotificationsScreen} options={{ title: 'Alerts' }} />
      <Tab.Screen name="DoctorProfile" component={DoctorProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}
