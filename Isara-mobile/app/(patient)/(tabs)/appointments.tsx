/**
 * Patient Appointments Tab
 * Lists all patient appointments with filtering
 */

import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { patientApi } from '@izara/api-client';

type FilterType = 'all' | 'upcoming' | 'completed' | 'cancelled';

export default function AppointmentsScreen() {
  const [filter, setFilter] = useState<FilterType>('upcoming');
  const [refreshing, setRefreshing] = useState(false);

  const { data: appointments, isLoading, refetch } = useQuery({
    queryKey: ['patient', 'appointments', filter],
    queryFn: () => patientApi.getAppointments({ status: filter === 'all' ? undefined : filter }),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'ทั้งหมด' },
    { key: 'upcoming', label: 'กำลังจะมา' },
    { key: 'completed', label: 'เสร็จแล้ว' },
    { key: 'cancelled', label: 'ยกเลิก' },
  ];

  return (
    <View style={styles.container}>
      {/* Filter Bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Appointments List */}
      <ScrollView
        style={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {isLoading && (
          <View style={styles.empty}><Text style={styles.emptyText}>กำลังโหลด...</Text></View>
        )}
        {!isLoading && appointments?.length > 0 && (
          appointments.map((apt: any) => (
            <TouchableOpacity
              key={apt.id}
              style={styles.card}
              onPress={() => router.push(`/(patient)/appointment/${apt.id}`)}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardDoctor}>{apt.doctor_name}</Text>
                <Text style={styles.cardType}>{apt.type === 'video' ? '📹' : '🏥'}</Text>
              </View>
              <Text style={styles.cardSpecialty}>{apt.specialty}</Text>
              <Text style={styles.cardDate}>📅 {apt.date} • 🕐 {apt.time}</Text>
            </TouchableOpacity>
          ))
        )}
        {!isLoading && (appointments?.length ?? 0) <= 0 && (
          <View style={styles.empty}>
            <Text style={{ fontSize: 48 }}>📋</Text>
            <Text style={styles.emptyText}>ไม่มีนัดหมาย</Text>
          </View>
        )}
      </ScrollView>

      {/* FAB - New Appointment */}
      <TouchableOpacity style={styles.fab} onPress={() => router.push('/(patient)/booking')}>
        <Text style={styles.fabText}>+ นัดหมาย</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  filterBar: { maxHeight: 52, paddingHorizontal: 16, paddingVertical: 8 },
  filterChip: { backgroundColor: '#f1f5f9', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, marginRight: 8 },
  filterChipActive: { backgroundColor: '#0ea5e9' },
  filterText: { fontSize: 13, fontWeight: '500', color: '#64748b' },
  filterTextActive: { color: '#ffffff' },
  list: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  card: { backgroundColor: '#ffffff', borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#f1f5f9' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  cardDoctor: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  cardType: { fontSize: 18 },
  cardSpecialty: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  cardDate: { fontSize: 13, color: '#374151', marginTop: 8 },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { color: '#9ca3af', marginTop: 8 },
  fab: { position: 'absolute', bottom: 24, right: 24, backgroundColor: '#0ea5e9', borderRadius: 28, paddingHorizontal: 24, paddingVertical: 14, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
