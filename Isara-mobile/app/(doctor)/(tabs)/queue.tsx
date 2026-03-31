/**
 * Doctor Queue Tab — Real-time queue management
 */

import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { doctorApi } from '@izara/api-client';

export default function QueueScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const { data: queue, isLoading, refetch } = useQuery({
    queryKey: ['doctor', 'queue', 'today'],
    queryFn: () => doctorApi.getTodayQueue(),
    refetchInterval: 15_000,
  });

  const callNext = useMutation({
    mutationFn: () => doctorApi.callNextPatient(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['doctor', 'queue'] }),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const waitingCount = queue?.filter((q: any) => q.status === 'waiting')?.length ?? 0;
  const currentPatient = queue?.find((q: any) => q.status === 'in_progress');

  return (
    <View style={styles.container}>
      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{waitingCount}</Text>
          <Text style={styles.statLabel}>รอตรวจ</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{queue?.length ?? 0}</Text>
          <Text style={styles.statLabel}>ทั้งหมด</Text>
        </View>
        <TouchableOpacity
          style={[styles.callNextBtn, waitingCount === 0 && { opacity: 0.4 }]}
          onPress={() => callNext.mutate()}
          disabled={waitingCount === 0 || callNext.isPending}
        >
          <Text style={styles.callNextText}>
            {callNext.isPending ? '...' : '📢 เรียกคิวถัดไป'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Current Patient */}
      {currentPatient && (
        <View style={styles.currentCard}>
          <Text style={styles.currentLabel}>กำลังตรวจ</Text>
          <View style={styles.currentRow}>
            <View style={styles.currentBadge}>
              <Text style={styles.currentBadgeText}>{currentPatient.queue_number}</Text>
            </View>
            <View>
              <Text style={styles.currentName}>{currentPatient.patient_name}</Text>
              <Text style={styles.currentSymptoms}>{currentPatient.symptoms}</Text>
            </View>
          </View>
          <View style={styles.currentActions}>
            <TouchableOpacity style={styles.emrActionBtn}
              onPress={() => router.push(`/(doctor)/emr/create/${currentPatient.appointment_id}`)}>
              <Text style={styles.emrActionText}>📋 สร้าง EMR</Text>
            </TouchableOpacity>
            {currentPatient.type === 'video' && (
              <TouchableOpacity style={styles.videoActionBtn}
                onPress={() => router.push(`/meeting/${currentPatient.appointment_id}`)}>
                <Text style={styles.videoActionText}>📹 วิดีโอ</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Queue List */}
      <ScrollView
        style={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {isLoading && (
          <View style={styles.empty}><Text style={styles.emptyText}>กำลังโหลด...</Text></View>
        )}
        {!isLoading && queue?.filter((q: any) => q.status === 'waiting')?.length > 0 && (
          queue.filter((q: any) => q.status === 'waiting').map((item: any) => (
            <View key={item.id} style={styles.queueItem}>
              <View style={styles.queueNumBadge}>
                <Text style={styles.queueNum}>{item.queue_number}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.queueName}>{item.patient_name}</Text>
                <Text style={styles.queueInfo}>🕐 {item.time} • {item.symptoms || 'ไม่ระบุ'}</Text>
              </View>
            </View>
          ))
        )}
        {!isLoading && (queue?.filter((q: any) => q.status === 'waiting')?.length ?? 0) <= 0 && (
          <View style={styles.empty}>
            <Text style={{ fontSize: 40 }}>✨</Text>
            <Text style={styles.emptyText}>ไม่มีผู้ป่วยรอในคิว</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  statsBar: { flexDirection: 'row', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', alignItems: 'center' },
  stat: { alignItems: 'center', marginRight: 24 },
  statValue: { fontSize: 24, fontWeight: '700', color: '#1e40af' },
  statLabel: { fontSize: 11, color: '#6b7280' },
  callNextBtn: { flex: 1, backgroundColor: '#1e40af', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  callNextText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  currentCard: { margin: 16, backgroundColor: '#eff6ff', borderRadius: 16, padding: 16, borderWidth: 2, borderColor: '#1e40af' },
  currentLabel: { fontSize: 12, fontWeight: '600', color: '#1e40af', marginBottom: 8, textTransform: 'uppercase' },
  currentRow: { flexDirection: 'row', alignItems: 'center' },
  currentBadge: { backgroundColor: '#1e40af', borderRadius: 20, width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  currentBadgeText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  currentName: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  currentSymptoms: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  currentActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  emrActionBtn: { flex: 1, backgroundColor: '#16a34a', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  emrActionText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  videoActionBtn: { flex: 1, backgroundColor: '#1e40af', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  videoActionText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  list: { flex: 1, paddingHorizontal: 16 },
  queueItem: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
  queueNumBadge: { backgroundColor: '#e0e7ff', borderRadius: 14, width: 32, height: 32, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  queueNum: { color: '#1e40af', fontWeight: '700', fontSize: 14 },
  queueName: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  queueInfo: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { color: '#9ca3af', marginTop: 8 },
});
