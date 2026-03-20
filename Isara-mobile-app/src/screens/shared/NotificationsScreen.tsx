import React, { useEffect, useState, useCallback } from 'react';
import { FlatList, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { useAuth } from '../../hooks/useAuth';
import { usePatientApi } from '../../hooks/usePatientApi';
import { useDoctorApi } from '../../hooks/useDoctorApi';
import { NotificationCard } from '../../components/cards/NotificationCard';
import { AppHeader } from '../../components/common/AppHeader';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import type { Notification } from '../../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function NotificationsScreen() {
  const navigation = useNavigation<Nav>();
  const { role } = useAuth();
  const patientApi = usePatientApi();
  const doctorApi = useDoctorApi();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const loading = role === 'patient' ? patientApi.loading : doctorApi.loading;

  const loadData = useCallback(async () => {
    if (role === 'patient') {
      const result = await patientApi.getNotifications();
      if (result?.notifications) {
        setNotifications(result.notifications);
      }
    } else {
      const result = await doctorApi.getNotifications();
      if (result?.notifications) {
        setNotifications(result.notifications);
      }
    }
  }, [role, patientApi, doctorApi]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function onRefresh(): Promise<void> {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  function handlePress(notification: Notification): void {
    if (notification.type === 'appointment' && notification.data?.appointmentId) {
      navigation.navigate('AppointmentDetail', {
        appointmentId: notification.data.appointmentId as string,
      });
    }
  }

  async function handleMarkRead(id: string): Promise<void> {
    if (role === 'patient') {
      await patientApi.markNotificationRead(id);
    } else {
      await doctorApi.markNotificationRead(id);
    }
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
  }

  function renderNotification({ item }: Readonly<{ item: Notification }>) {
    return (
      <NotificationCard
        notification={item}
        onPress={() => {
          handlePress(item);
          void handleMarkRead(item.id);
        }}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader title="Notifications" />
      {(loading && !refreshing) && <LoadingSpinner />}
      {!loading && (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderNotification}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<EmptyState icon="🔔" title="No notifications" message="You're all caught up!" />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  list: { padding: 16 },
});
