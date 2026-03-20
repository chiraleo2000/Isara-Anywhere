import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { usePatientApi } from '../../hooks/usePatientApi';
import { AppointmentCard } from '../../components/cards/AppointmentCard';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import type { Appointment } from '../../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function AppointmentsScreen() {
  const navigation = useNavigation<Nav>();
  const { getUpcomingAppointments, getAppointmentHistory, loading } = usePatientApi();
  const [tab, setTab] = useState<'upcoming' | 'history'>('upcoming');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const result = tab === 'upcoming'
      ? await getUpcomingAppointments()
      : await getAppointmentHistory();
    if (result?.appointments) {
      setAppointments(result.appointments);
    }
  }, [tab, getUpcomingAppointments, getAppointmentHistory]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function onRefresh(): Promise<void> {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Appointments</Text>
        <TouchableOpacity style={styles.bookBtn} onPress={() => navigation.navigate('BookAppointment', {})}>
          <Text style={styles.bookBtnText}>+ Book</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'upcoming' && styles.activeTab]}
          onPress={() => setTab('upcoming')}
        >
          <Text style={[styles.tabText, tab === 'upcoming' && styles.activeTabText]}>Upcoming</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'history' && styles.activeTab]}
          onPress={() => setTab('history')}
        >
          <Text style={[styles.tabText, tab === 'history' && styles.activeTabText]}>History</Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing && <LoadingSpinner />}

      {!loading && (
        <FlatList
          data={appointments}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <AppointmentCard
              appointment={item}
              onPress={(a) => navigation.navigate('AppointmentDetail', { appointmentId: a.id })}
            />
          )}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<EmptyState icon="📅" title="No appointments" message={tab === 'upcoming' ? 'Book your first appointment' : 'No past appointments'} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#1e40af' },
  title: { fontSize: 20, fontWeight: '700', color: '#fff' },
  bookBtn: { backgroundColor: '#ffffff20', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  bookBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#1e40af' },
  tabText: { fontSize: 15, color: '#64748b', fontWeight: '500' },
  activeTabText: { color: '#1e40af', fontWeight: '700' },
  list: { padding: 16 },
});
