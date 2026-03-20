import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { PatientHomeScreen } from '../screens/patient/PatientHomeScreen';
import { AppointmentsScreen } from '../screens/patient/AppointmentsScreen';
import { HealthRecordsScreen } from '../screens/patient/HealthRecordsScreen';
import { NotificationsScreen } from '../screens/shared/NotificationsScreen';
import { PatientProfileScreen } from '../screens/patient/PatientProfileScreen';

export type PatientTabParamList = {
  PatientHome: undefined;
  Appointments: undefined;
  HealthRecords: undefined;
  Notifications: undefined;
  PatientProfile: undefined;
};

const Tab = createBottomTabNavigator<PatientTabParamList>();

function getTabIcon(routeName: string, focused: boolean): string {
  const icons: Record<string, string> = {
    PatientHome: focused ? '🏠' : '🏡',
    Appointments: focused ? '📅' : '📆',
    HealthRecords: focused ? '❤️' : '🤍',
    Notifications: focused ? '🔔' : '🔕',
    PatientProfile: focused ? '👤' : '👥',
  };
  return icons[routeName] ?? '•';
}

function renderTabIcon(routeName: string, focused: boolean): React.ReactNode {
  const icon = getTabIcon(routeName, focused);
  return <Text style={{ fontSize: 22 }}>{icon}</Text>;
}

export function PatientNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => renderTabIcon(route.name, focused),
        tabBarActiveTintColor: '#1e40af',
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
      <Tab.Screen name="PatientHome" component={PatientHomeScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="Appointments" component={AppointmentsScreen} options={{ title: 'Appointments' }} />
      <Tab.Screen name="HealthRecords" component={HealthRecordsScreen} options={{ title: 'Health' }} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Alerts' }} />
      <Tab.Screen name="PatientProfile" component={PatientProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}
