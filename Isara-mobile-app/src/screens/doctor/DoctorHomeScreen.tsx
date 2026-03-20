import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { useAuth } from '../../hooks/useAuth';
import { useDoctorApi } from '../../hooks/useDoctorApi';
import { AppointmentCard } from '../../components/cards/AppointmentCard';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import type { Appointment } from '../../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function DoctorHomeScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const { getDashboard, getAppointments, loading } = useDoctorApi();
  const [stats, setStats] = useState({ todayCount: 0, pendingCount: 0, patientsCount: 0 });
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const userId = user?.id ?? '';
    const dashResult = await getDashboard(userId);
    if (dashResult?.stats) {
      setStats({
        todayCount: dashResult.stats.completedToday ?? 0,
        pendingCount: dashResult.stats.pending ?? 0,
        patientsCount: dashResult.stats.confirmed ?? 0,
      });
    }
    const apptResult = await getAppointments(userId);
    if (apptResult?.appointments) {
      setAppointments(apptResult.appointments.slice(0, 5));
    }
  }, [user?.id, getDashboard, getAppointments]);

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
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Welcome, Dr. {user?.name ?? 'Doctor'}</Text>
          <Text style={styles.subGreeting}>Here&apos;s your schedule today</Text>
        </View>

        <View style={styles.statsRow}>
          <StatCard value={stats.todayCount} label="Today" color="#1e40af" />
          <StatCard value={stats.pendingCount} label="Pending" color="#d97706" />
          <StatCard value={stats.patientsCount} label="Patients" color="#047857" />
        </View>

        {loading && <LoadingSpinner size="small" />}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today&apos;s Appointments</Text>
            <TouchableOpacity onPress={() => navigation.getParent()?.navigate('Queue')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          {appointments.length === 0 && !loading && (
            <Text style={styles.emptyText}>No appointments today</Text>
          )}
          {appointments.map((appt) => (
            <AppointmentCard
              key={appt.id}
              appointment={appt}
              onPress={(a) => navigation.navigate('AppointmentDetail', { appointmentId: a.id })}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

interface StatCardProps {
  readonly value: number;
  readonly label: string;
  readonly color: string;
}

function StatCard(props: Readonly<StatCardProps>) {
  return (
    <View style={[styles.statCard, { borderTopColor: props.color }]}>
      <Text style={[styles.statValue, { color: props.color }]}>{props.value}</Text>
      <Text style={styles.statLabel}>{props.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { backgroundColor: '#047857', padding: 20, paddingBottom: 24 },
  greeting: { fontSize: 22, fontWeight: '700', color: '#fff' },
  subGreeting: { fontSize: 14, color: '#a7f3d0', marginTop: 4 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', padding: 16 },
  statCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center', width: '30%', borderTopWidth: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  statValue: { fontSize: 28, fontWeight: '700' },
  statLabel: { fontSize: 12, color: '#64748b', marginTop: 2 },
  section: { padding: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  seeAll: { fontSize: 14, color: '#047857', fontWeight: '600' },
  emptyText: { fontSize: 14, color: '#94a3b8', textAlign: 'center', paddingVertical: 20 },
});
