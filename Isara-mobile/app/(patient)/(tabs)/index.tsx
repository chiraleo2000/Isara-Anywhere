/**
 * Patient Dashboard — Home tab
 * Shows greeting, quick actions, health summary, upcoming appointments
 */

import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../../src/stores/authStore';
import { patientApi } from '@izara/api-client';

function QuickAction({ icon, label, onPress, bgColor }: {
  icon: string; label: string; onPress: () => void; bgColor: string;
}) {
  return (
    <TouchableOpacity style={[styles.quickAction, { backgroundColor: bgColor }]} onPress={onPress}>
      <Text style={styles.quickActionIcon}>{icon}</Text>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function AppointmentCard({ appointment }: { appointment: any }) {
  const statusLabels: Record<string, string> = {
    confirmed: 'ยืนยันแล้ว', pending: 'รอการยืนยัน', in_progress: 'กำลังดำเนินการ',
  };
  const statusColors: Record<string, string> = {
    confirmed: '#dcfce7', pending: '#fef9c3', in_progress: '#dbeafe',
  };

  return (
    <TouchableOpacity
      style={styles.appointmentCard}
      onPress={() => router.push(`/(patient)/appointment/${appointment.id}`)}
    >
      <View style={styles.appointmentRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.doctorName}>{appointment.doctor_name}</Text>
          <Text style={styles.specialty}>{appointment.specialty}</Text>
          <Text style={styles.dateTime}>📅 {appointment.date}  🕐 {appointment.time}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColors[appointment.status] || '#f3f4f6' }]}>
          <Text style={styles.statusText}>{statusLabels[appointment.status] || appointment.status}</Text>
        </View>
      </View>
      {appointment.type === 'video' && (
        <TouchableOpacity
          style={styles.videoButton}
          onPress={() => router.push(`/meeting/${appointment.id}`)}
        >
          <Text style={styles.videoButtonText}>📹 เข้าร่วมวิดีโอ</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

export default function PatientDashboardScreen() {
  const { user } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);

  const { data: appointments, isLoading, refetch } = useQuery({
    queryKey: ['patient', 'appointments', 'upcoming'],
    queryFn: () => patientApi.getUpcomingAppointments(),
  });

  const { data: healthSummary } = useQuery({
    queryKey: ['patient', 'health', 'summary'],
    queryFn: () => patientApi.getHealthSummary(),
  });

  const { data: notificationCount } = useQuery({
    queryKey: ['patient', 'notifications', 'unread-count'],
    queryFn: () => patientApi.getUnreadNotificationCount(),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Greeting Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>สวัสดี 👋</Text>
            <Text style={styles.userName}>{user?.first_name || 'ผู้ใช้'}</Text>
          </View>
          <TouchableOpacity style={styles.notifButton} onPress={() => router.push('/(patient)/notifications')}>
            <Text style={{ fontSize: 24 }}>🔔</Text>
            {(notificationCount?.count ?? 0) > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{notificationCount!.count}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActionsContainer}>
        <View style={styles.quickActionsRow}>
          <QuickAction icon="📋" label="นัดหมาย" onPress={() => router.push('/(patient)/booking')} bgColor="#e0f2fe" />
          <QuickAction icon="🤖" label="ปรึกษา AI" onPress={() => router.push('/(patient)/(tabs)/ai-chat')} bgColor="#f3e8ff" />
          <QuickAction icon="💊" label="ยาของฉัน" onPress={() => router.push('/(patient)/health/medications')} bgColor="#dcfce7" />
          <QuickAction icon="📍" label="ใกล้เคียง" onPress={() => {}} bgColor="#ffedd5" />
        </View>
      </View>

      {/* Health Summary */}
      {healthSummary && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>สรุปสุขภาพ</Text>
          <View style={styles.healthCard}>
            <View style={styles.healthRow}>
              {[
                { icon: '❤️', value: healthSummary.heartRate || '--', label: 'ชีพจร (bpm)' },
                { icon: '🩸', value: healthSummary.bloodPressure || '--/--', label: 'ความดัน' },
                { icon: '🌡️', value: healthSummary.temperature || '--', label: 'อุณหภูมิ (°C)' },
                { icon: '⚖️', value: healthSummary.weight || '--', label: 'น้ำหนัก (kg)' },
              ].map((item, i) => (
                <View key={i} style={styles.healthItem}>
                  <Text style={{ fontSize: 24 }}>{item.icon}</Text>
                  <Text style={styles.healthValue}>{item.value}</Text>
                  <Text style={styles.healthLabel}>{item.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* Upcoming Appointments */}
      <View style={[styles.section, { marginBottom: 32 }]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>นัดหมายที่กำลังจะมาถึง</Text>
          <TouchableOpacity onPress={() => router.push('/(patient)/(tabs)/appointments')}>
            <Text style={styles.seeAll}>ดูทั้งหมด</Text>
          </TouchableOpacity>
        </View>
        {isLoading ? (
          <View style={styles.emptyCard}><Text style={styles.emptyText}>กำลังโหลด...</Text></View>
        ) : appointments?.length > 0 ? (
          appointments.slice(0, 3).map((apt: any) => <AppointmentCard key={apt.id} appointment={apt} />)
        ) : (
          <View style={styles.emptyCard}>
            <Text style={{ fontSize: 40, marginBottom: 8 }}>📅</Text>
            <Text style={styles.emptyText}>ไม่มีนัดหมายที่กำลังจะมาถึง</Text>
            <TouchableOpacity style={styles.bookButton} onPress={() => router.push('/(patient)/booking')}>
              <Text style={styles.bookButtonText}>นัดหมายแพทย์</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { backgroundColor: '#0ea5e9', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { color: '#ffffff', fontSize: 14 },
  userName: { color: '#ffffff', fontSize: 22, fontWeight: '700', marginTop: 4 },
  notifButton: { position: 'relative' },
  notifBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#ef4444', borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  notifBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  quickActionsContainer: { paddingHorizontal: 16, marginTop: -16 },
  quickActionsRow: { backgroundColor: '#fff', borderRadius: 16, padding: 16, flexDirection: 'row', gap: 8, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  quickAction: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  quickActionIcon: { fontSize: 24, marginBottom: 4 },
  quickActionLabel: { fontSize: 11, fontWeight: '500', color: '#374151', textAlign: 'center' },
  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  seeAll: { color: '#0ea5e9', fontSize: 14, fontWeight: '500' },
  healthCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  healthRow: { flexDirection: 'row', justifyContent: 'space-between' },
  healthItem: { alignItems: 'center', flex: 1 },
  healthValue: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginTop: 4 },
  healthLabel: { fontSize: 10, color: '#6b7280', marginTop: 2 },
  appointmentCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  appointmentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  doctorName: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  specialty: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  dateTime: { fontSize: 13, color: '#374151', marginTop: 6 },
  statusBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '500' },
  videoButton: { backgroundColor: '#0ea5e9', borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 12 },
  videoButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  emptyCard: { backgroundColor: '#fff', borderRadius: 16, padding: 32, alignItems: 'center' },
  emptyText: { color: '#9ca3af', textAlign: 'center' },
  bookButton: { backgroundColor: '#0ea5e9', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12, marginTop: 16 },
  bookButtonText: { color: '#fff', fontWeight: '600' },
});
