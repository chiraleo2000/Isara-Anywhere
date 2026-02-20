/**
 * API Connections Settings — Manage external service connections
 * Phase 2: Uses user_api_connections table via /api/connections
 */

import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../src/stores/authStore';
import { patientApi } from '@izara/api-client';

interface ApiConnection {
  service_type: string;
  label: string;
  icon: string;
  connected: boolean;
  last_sync?: string;
}

const SERVICES = [
  { type: 'apple_health', label: 'Apple Health', icon: '🍎' },
  { type: 'google_fit', label: 'Google Fit', icon: '💪' },
  { type: 'samsung_health', label: 'Samsung Health', icon: '📱' },
  { type: 'fitbit', label: 'Fitbit', icon: '⌚' },
  { type: 'pharmacy', label: 'ระบบร้านยา', icon: '💊' },
  { type: 'lab', label: 'ระบบห้องแล็บ', icon: '🧪' },
  { type: 'insurance', label: 'ประกันสุขภาพ', icon: '🛡️' },
];

export default function ConnectionsSettingsScreen() {
  const { accessToken, activeRole } = useAuthStore();
  const themeColor = activeRole === 'doctor' ? '#1e40af' : '#0ea5e9';
  const queryClient = useQueryClient();

  const { data: connections, isLoading } = useQuery({
    queryKey: ['settings', 'connections'],
    queryFn: () => patientApi.getApiConnections?.(accessToken!) || [],
  });

  const connectMutation = useMutation({
    mutationFn: (serviceType: string) =>
      patientApi.connectService?.(serviceType, accessToken!) || Promise.resolve(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings', 'connections'] }),
  });

  const disconnectMutation = useMutation({
    mutationFn: (serviceType: string) =>
      patientApi.disconnectService?.(serviceType, accessToken!) || Promise.resolve(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings', 'connections'] }),
  });

  const handleConnect = (serviceType: string) => {
    connectMutation.mutate(serviceType);
  };

  const handleDisconnect = (serviceType: string) => {
    Alert.alert('ยกเลิกการเชื่อมต่อ', `ต้องการยกเลิกการเชื่อมต่อกับ ${serviceType}?`, [
      { text: 'ยกเลิก', style: 'cancel' },
      { text: 'ยืนยัน', style: 'destructive', onPress: () => disconnectMutation.mutate(serviceType) },
    ]);
  };

  if (isLoading) {
    return <View style={styles.loading}><ActivityIndicator size="large" color={themeColor} /></View>;
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>เชื่อมต่อบริการ</Text>
      <Text style={styles.subtitle}>เชื่อมต่อแอปสุขภาพและบริการภายนอกเพื่อซิงค์ข้อมูล</Text>

      {SERVICES.map((svc) => {
        const conn = (connections || []).find((c: any) => c.service_type === svc.type);
        const isConnected = !!conn?.connected;

        return (
          <View key={svc.type} style={styles.card}>
            <Text style={styles.cardIcon}>{svc.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardLabel}>{svc.label}</Text>
              {isConnected && conn?.last_sync && (
                <Text style={styles.lastSync}>ซิงค์ล่าสุด: {conn.last_sync}</Text>
              )}
            </View>
            <TouchableOpacity
              style={[styles.connectBtn, isConnected && styles.disconnectBtn]}
              onPress={() => isConnected ? handleDisconnect(svc.type) : handleConnect(svc.type)}
              disabled={connectMutation.isPending || disconnectMutation.isPending}
            >
              <Text style={[styles.connectBtnText, isConnected && styles.disconnectBtnText]}>
                {isConnected ? 'ยกเลิก' : 'เชื่อมต่อ'}
              </Text>
            </TouchableOpacity>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  subtitle: { fontSize: 13, color: '#6b7280', marginTop: 4, marginBottom: 24 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 8, borderWidth: 1, borderColor: '#f1f5f9' },
  cardIcon: { fontSize: 28, marginRight: 14 },
  cardLabel: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  lastSync: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  connectBtn: { backgroundColor: '#0ea5e9', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  disconnectBtn: { backgroundColor: '#fee2e2' },
  connectBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  disconnectBtnText: { color: '#ef4444' },
});
