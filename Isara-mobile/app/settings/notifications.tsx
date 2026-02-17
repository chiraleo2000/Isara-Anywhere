/**
 * Notification Settings — Push/email/SMS preferences per notification type
 * Phase 2: Uses notification_preferences table via /api/settings/notifications
 */

import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Switch, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../src/stores/authStore';
import { patientApi, doctorApi } from '@izara/api-client';

interface NotifPref {
  type: string;
  label: string;
  push: boolean;
  email: boolean;
  sms: boolean;
}

const DEFAULT_PREFS: NotifPref[] = [
  { type: 'appointment_reminder', label: 'เตือนนัดหมาย', push: true, email: true, sms: false },
  { type: 'appointment_update', label: 'อัปเดตนัดหมาย', push: true, email: true, sms: false },
  { type: 'prescription_ready', label: 'ใบสั่งยาพร้อม', push: true, email: false, sms: false },
  { type: 'lab_result', label: 'ผลแล็บออกแล้ว', push: true, email: true, sms: true },
  { type: 'chat_message', label: 'ข้อความแชท', push: true, email: false, sms: false },
  { type: 'system_update', label: 'อัปเดตระบบ', push: false, email: true, sms: false },
];

export default function NotificationSettingsScreen() {
  const { activeRole, accessToken } = useAuthStore();
  const api = activeRole === 'doctor' ? doctorApi : patientApi;
  const themeColor = activeRole === 'doctor' ? '#1e40af' : '#0ea5e9';
  const queryClient = useQueryClient();

  const [prefs, setPrefs] = useState<NotifPref[]>(DEFAULT_PREFS);

  const { data, isLoading } = useQuery({
    queryKey: ['settings', 'notifications', activeRole],
    queryFn: () => api.getNotificationPreferences?.(accessToken!) || DEFAULT_PREFS,
  });

  useEffect(() => {
    if (data && Array.isArray(data)) setPrefs(data);
  }, [data]);

  const mutation = useMutation({
    mutationFn: (updated: NotifPref[]) =>
      api.updateNotificationPreferences?.(updated, accessToken!) || Promise.resolve(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings', 'notifications'] }),
  });

  const togglePref = (index: number, channel: 'push' | 'email' | 'sms') => {
    const updated = [...prefs];
    updated[index] = { ...updated[index], [channel]: !updated[index][channel] };
    setPrefs(updated);
    mutation.mutate(updated);
  };

  if (isLoading) {
    return (
      <View style={styles.loading}><ActivityIndicator size="large" color={themeColor} /></View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>ตั้งค่าช่องทางการแจ้งเตือน</Text>
      <Text style={styles.subtitle}>เลือกช่องทางที่ต้องการรับการแจ้งเตือนสำหรับแต่ละประเภท</Text>

      {/* Column Headers */}
      <View style={styles.colHeaders}>
        <Text style={[styles.colHeader, { flex: 1 }]}>ประเภท</Text>
        <Text style={[styles.colHeader, { width: 50, textAlign: 'center' }]}>พุช</Text>
        <Text style={[styles.colHeader, { width: 50, textAlign: 'center' }]}>อีเมล</Text>
        <Text style={[styles.colHeader, { width: 50, textAlign: 'center' }]}>SMS</Text>
      </View>

      {prefs.map((pref, i) => (
        <View key={pref.type} style={styles.row}>
          <Text style={styles.rowLabel}>{pref.label}</Text>
          <Switch
            style={styles.toggle}
            value={pref.push}
            onValueChange={() => togglePref(i, 'push')}
            trackColor={{ true: themeColor }}
          />
          <Switch
            style={styles.toggle}
            value={pref.email}
            onValueChange={() => togglePref(i, 'email')}
            trackColor={{ true: themeColor }}
          />
          <Switch
            style={styles.toggle}
            value={pref.sms}
            onValueChange={() => togglePref(i, 'sms')}
            trackColor={{ true: themeColor }}
          />
        </View>
      ))}

      {mutation.isPending && (
        <Text style={styles.saving}>กำลังบันทึก...</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  subtitle: { fontSize: 13, color: '#6b7280', marginTop: 4, marginBottom: 24 },
  colHeaders: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  colHeader: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  rowLabel: { flex: 1, fontSize: 14, fontWeight: '500', color: '#0f172a' },
  toggle: { width: 50, transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] },
  saving: { textAlign: 'center', color: '#6b7280', marginTop: 16, fontSize: 13 },
});
