/**
 * Doctor Schedule Tab — Appointment calendar and schedule management
 */

import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { doctorApi } from '@izara/api-client';

export default function ScheduleScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [refreshing, setRefreshing] = useState(false);

  const { data: appointments, isLoading, refetch } = useQuery({
    queryKey: ['doctor', 'schedule', selectedDate],
    queryFn: () => doctorApi.getAppointmentsByDate(selectedDate),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Generate dates for the next 7 days
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      date: d.toISOString().split('T')[0],
      day: d.toLocaleDateString('th-TH', { weekday: 'short' }),
      num: d.getDate(),
    };
  });

  return (
    <View style={styles.container}>
      {/* Date Selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateBar}>
        {dates.map((d) => (
          <TouchableOpacity
            key={d.date}
            style={[styles.dateChip, selectedDate === d.date && styles.dateChipActive]}
            onPress={() => setSelectedDate(d.date)}
          >
            <Text style={[styles.dateDay, selectedDate === d.date && styles.dateDayActive]}>{d.day}</Text>
            <Text style={[styles.dateNum, selectedDate === d.date && styles.dateNumActive]}>{d.num}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Appointments */}
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
              onPress={() => router.push(`/(doctor)/patient/${apt.id}`)}
            >
              <View style={styles.timeCol}>
                <Text style={styles.timeText}>{apt.time}</Text>
                <Text style={styles.typeText}>{apt.type === 'video' ? '📹' : '🏥'}</Text>
              </View>
              <View style={styles.infoCol}>
                <Text style={styles.patientName}>{apt.patient_name}</Text>
                <Text style={styles.symptoms}>{apt.symptoms || 'ไม่ระบุอาการ'}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
        {!isLoading && (appointments?.length ?? 0) <= 0 && (
          <View style={styles.empty}>
            <Text style={{ fontSize: 40 }}>📅</Text>
            <Text style={styles.emptyText}>ไม่มีนัดหมายในวันที่เลือก</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  dateBar: { maxHeight: 80, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  dateChip: { alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, marginHorizontal: 4, backgroundColor: '#f1f5f9' },
  dateChipActive: { backgroundColor: '#1e40af' },
  dateDay: { fontSize: 11, color: '#6b7280', fontWeight: '500' },
  dateDayActive: { color: '#bfdbfe' },
  dateNum: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginTop: 2 },
  dateNumActive: { color: '#fff' },
  list: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 8, flexDirection: 'row', borderWidth: 1, borderColor: '#f1f5f9' },
  timeCol: { alignItems: 'center', marginRight: 16, minWidth: 50 },
  timeText: { fontSize: 14, fontWeight: '600', color: '#1e40af' },
  typeText: { fontSize: 16, marginTop: 4 },
  infoCol: { flex: 1 },
  patientName: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  symptoms: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { color: '#9ca3af', marginTop: 8 },
});
