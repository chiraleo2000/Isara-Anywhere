import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { useDoctorApi } from '../../hooks/useDoctorApi';
import { AppointmentCard } from '../../components/cards/AppointmentCard';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import type { Appointment } from '../../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function QueueScreen() {
  const navigation = useNavigation<Nav>();
  const { getQueue, claimAppointment, loading } = useDoctorApi();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadQueue = useCallback(async () => {
    const result = await getQueue();
    if (result?.queue) {
      setAppointments(result.queue);
    }
  }, [getQueue]);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  async function onRefresh(): Promise<void> {
    setRefreshing(true);
    await loadQueue();
    setRefreshing(false);
  }

  async function handleClaim(appointmentId: string): Promise<void> {
    await claimAppointment(appointmentId);
    await loadQueue();
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Patient Queue</Text>
        <Text style={styles.count}>{appointments.length} patients</Text>
      </View>

      {(loading && !refreshing) && <LoadingSpinner />}

      {!loading && (
        <FlatList
          data={appointments}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <View style={styles.queueItem}>
              <View style={styles.queueNumber}>
                <Text style={styles.queueNumberText}>{index + 1}</Text>
              </View>
              <View style={styles.queueContent}>
                <AppointmentCard
                  appointment={item}
                  onPress={(a) => navigation.navigate('AppointmentDetail', { appointmentId: a.id })}
                />
                <View style={styles.actions}>
                  {item.status === 'pending' && (
                    <TouchableOpacity
                      style={styles.confirmBtn}
                      onPress={() => { void handleClaim(item.id); }}
                    >
                      <Text style={styles.btnText}>Claim</Text>
                    </TouchableOpacity>
                  )}
                  {item.status === 'confirmed' && (
                    <TouchableOpacity
                      style={styles.startBtn}
                      onPress={() => navigation.navigate('Meeting', { meetingId: item.id, jitsiUrl: '' })}
                    >
                      <Text style={styles.btnText}>Start</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          )}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<EmptyState icon="📋" title="Queue is empty" message="No patients in queue today" />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#047857' },
  title: { fontSize: 20, fontWeight: '700', color: '#fff' },
  count: { fontSize: 14, color: '#a7f3d0', fontWeight: '500' },
  list: { padding: 16 },
  queueItem: { flexDirection: 'row', marginBottom: 8 },
  queueNumber: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#047857', justifyContent: 'center', alignItems: 'center', marginRight: 8, marginTop: 12 },
  queueNumberText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  queueContent: { flex: 1 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: -4, marginBottom: 8 },
  confirmBtn: { backgroundColor: '#1e40af', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 6 },
  startBtn: { backgroundColor: '#047857', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 6 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
});
