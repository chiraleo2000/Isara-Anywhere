/**
 * Doctor Dashboard — Home tab
 * Shows stats, today's appointments, quick actions
 */

import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, RefreshControl, StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore, type DoctorUser } from '../../../../src/stores/authStore';
import { doctorApi } from '@izara/api-client';

function StatCard({ icon, label, value, bgColor }: {
  icon: string; label: string; value: string | number; bgColor: string;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: bgColor }]}>
      <Text style={{ fontSize: 20 }}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function AppointmentCard({ appointment }: { appointment: any }) {
  const borderColors: Record<string, string> = {
    confirmed: '#22c55e', waiting: '#eab308', in_progress: '#3b82f6', pending: '#f97316',
  };

  return (
    <TouchableOpacity
      style={[styles.appointmentCard, { borderLeftColor: borderColors[appointment.status] || '#d1d5db' }]}
      onPress={() => router.push(`/(doctor)/patient/${appointment.id}`)}
    >
      <View style={styles.appointmentHeader}>
        <View style={{ flex: 1 }}>
          <View style={styles.patientRow}>
            {appointment.queue_number != null && (
              <View style={styles.queueBadge}>
                <Text style={styles.queueText}>{appointment.queue_number}</Text>
              </View>
            )}
            <Text style={styles.patientName}>{appointment.patient_name}</Text>
            <Text style={styles.patientAge}>อายุ {appointment.patient_age} ปี</Text>
          </View>
          <Text style={styles.symptoms} numberOfLines={2}>อาการ: {appointment.symptoms}</Text>
          <Text style={styles.time}>🕐 {appointment.time}</Text>
        </View>
      </View>
      <View style={styles.actionRow}>
        {appointment.type === 'video' && (
          <TouchableOpacity style={styles.videoBtn} onPress={() => router.push(`/meeting/${appointment.id}`)}>
            <Text style={styles.videoBtnText}>📹 เริ่มวิดีโอ</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.emrBtn} onPress={() => router.push(`/(doctor)/emr/create/${appointment.id}`)}>
          <Text style={styles.emrBtnText}>📋 สร้าง EMR</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default function DoctorDashboardScreen() {
  const { user } = useAuthStore();
  const doctorUser = user as DoctorUser;
  const [refreshing, setRefreshing] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ['doctor', 'stats', 'today'],
    queryFn: () => doctorApi.getTodayStats(),
    refetchInterval: 60_000,
  });

  const { data: appointments, isLoading, refetch } = useQuery({
    queryKey: ['doctor', 'appointments', 'today'],
    queryFn: () => doctorApi.getTodayAppointments(),
    refetchInterval: 30_000,
  });

  const { data: pendingCount } = useQuery({
    queryKey: ['doctor', 'pending-appointments'],
    queryFn: () => doctorApi.getPendingAppointmentsCount(),
  });

  const { data: notifCount } = useQuery({
    queryKey: ['doctor', 'notifications', 'unread-count'],
    queryFn: () => doctorApi.getUnreadNotificationCount(),
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
      {/* Doctor Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>สวัสดี 👋</Text>
            <Text style={styles.doctorName}>{doctorUser?.prefix || 'นพ.'} {doctorUser?.first_name || 'แพทย์'}</Text>
            <Text style={styles.specialty}>{doctorUser?.specialty || 'แพทย์ทั่วไป'}</Text>
          </View>
          <TouchableOpacity style={styles.notifButton} onPress={() => router.push('/(doctor)/notifications')}>
            <Text style={{ fontSize: 24 }}>🔔</Text>
            {(notifCount?.count ?? 0) > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{notifCount!.count}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <StatCard icon="📋" label="นัดหมายวันนี้" value={stats?.todayAppointments ?? 0} bgColor="#dbeafe" />
        <StatCard icon="✅" label="ตรวจแล้ว" value={stats?.completedToday ?? 0} bgColor="#dcfce7" />
        <StatCard icon="⏳" label="รอยืนยัน" value={pendingCount?.count ?? 0} bgColor="#ffedd5" />
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <View style={styles.quickActionsCard}>
          <TouchableOpacity style={styles.quickBtn} onPress={() => router.push('/(doctor)/(tabs)/queue')}>
            <Text style={{ fontSize: 20, marginBottom: 4 }}>🏥</Text>
            <Text style={styles.quickBtnLabel}>จัดการคิว</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtn} onPress={() => router.push('/(doctor)/(tabs)/patients')}>
            <Text style={{ fontSize: 20, marginBottom: 4 }}>🔍</Text>
            <Text style={styles.quickBtnLabel}>ค้นหาผู้ป่วย</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtn} onPress={() => router.push('/(doctor)/(tabs)/schedule')}>
            <Text style={{ fontSize: 20, marginBottom: 4 }}>📅</Text>
            <Text style={styles.quickBtnLabel}>ตารางนัด</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Today's Appointments */}
      <View style={[styles.section, { marginBottom: 32 }]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>นัดหมายวันนี้</Text>
          <TouchableOpacity onPress={() => router.push('/(doctor)/(tabs)/schedule')}>
            <Text style={styles.seeAll}>ดูทั้งหมด</Text>
          </TouchableOpacity>
        </View>
        {isLoading ? (
          <View style={styles.emptyCard}><Text style={styles.emptyText}>กำลังโหลด...</Text></View>
        ) : appointments?.length > 0 ? (
          appointments.map((apt: any) => <AppointmentCard key={apt.id} appointment={apt} />)
        ) : (
          <View style={styles.emptyCard}>
            <Text style={{ fontSize: 40, marginBottom: 8 }}>✨</Text>
            <Text style={styles.emptyText}>ไม่มีนัดหมายวันนี้</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { backgroundColor: '#1e40af', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { color: '#bfdbfe', fontSize: 14 },
  doctorName: { color: '#ffffff', fontSize: 22, fontWeight: '700', marginTop: 4 },
  specialty: { color: '#bfdbfe', fontSize: 14, marginTop: 2 },
  notifButton: { position: 'relative' },
  notifBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#ef4444', borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  notifBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  statsContainer: { flexDirection: 'row', paddingHorizontal: 16, marginTop: -16, gap: 8 },
  statCard: { flex: 1, borderRadius: 14, padding: 14 },
  statValue: { fontSize: 22, fontWeight: '700', color: '#0f172a', marginTop: 8 },
  statLabel: { fontSize: 10, color: '#374151', marginTop: 2 },
  quickActions: { paddingHorizontal: 16, marginTop: 16 },
  quickActionsCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, flexDirection: 'row', gap: 8, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  quickBtn: { flex: 1, backgroundColor: '#f1f5f9', borderRadius: 12, padding: 12, alignItems: 'center' },
  quickBtnLabel: { fontSize: 11, fontWeight: '500', color: '#374151' },
  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  seeAll: { color: '#1e40af', fontSize: 14, fontWeight: '500' },
  appointmentCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10, borderLeftWidth: 4, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  appointmentHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  patientRow: { flexDirection: 'row', alignItems: 'center' },
  queueBadge: { backgroundColor: '#1e40af', borderRadius: 14, width: 28, height: 28, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  queueText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  patientName: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  patientAge: { fontSize: 13, color: '#6b7280', marginLeft: 8 },
  symptoms: { fontSize: 13, color: '#374151', marginTop: 4 },
  time: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  videoBtn: { backgroundColor: '#1e40af', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16, flex: 1, alignItems: 'center' },
  videoBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  emrBtn: { backgroundColor: '#16a34a', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16, flex: 1, alignItems: 'center' },
  emrBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  emptyCard: { backgroundColor: '#fff', borderRadius: 16, padding: 32, alignItems: 'center' },
  emptyText: { color: '#9ca3af' },
});
