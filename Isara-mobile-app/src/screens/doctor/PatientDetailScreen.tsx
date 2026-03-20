import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { useDoctorApi } from '../../hooks/useDoctorApi';
import { AppHeader } from '../../components/common/AppHeader';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import type { PHRRecord, VitalSign } from '../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'PatientDetail'>;

export function PatientDetailScreen({ navigation, route }: Readonly<Props>) {
  const { patientId } = route.params;
  const { getPatientDetail, loading } = useDoctorApi();
  const [phr, setPhr] = useState<PHRRecord | null>(null);
  const [vitals, setVitals] = useState<VitalSign[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const result = await getPatientDetail(patientId);
    if (result) {
      const data = result as { phr?: PHRRecord; vitals?: VitalSign[] };
      if (data.phr) setPhr(data.phr);
      if (data.vitals) setVitals(data.vitals.slice(0, 5));
    }
  }, [patientId, getPatientDetail]);

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
      <AppHeader title="Patient Detail" onBack={() => navigation.goBack()} />
      {(loading && !refreshing) && <LoadingSpinner />}
      {!loading && (
        <ScrollView
          style={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Demographics */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Demographics</Text>
            <InfoRow label="Name" value={phr?.demographics?.name ?? 'N/A'} />
            <InfoRow label="DOB" value={phr?.demographics?.dateOfBirth ?? 'N/A'} />
            <InfoRow label="Gender" value={phr?.demographics?.gender ?? 'N/A'} />
            <InfoRow label="Blood Type" value={phr?.demographics?.bloodType ?? 'N/A'} />
          </View>

          {/* Quick Actions */}
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('EMREditor', { patientId })}>
              <Text style={styles.actionIcon}>📝</Text>
              <Text style={styles.actionLabel}>EMR</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('PrescriptionEditor', { patientId })}>
              <Text style={styles.actionIcon}>💊</Text>
              <Text style={styles.actionLabel}>Rx</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('LabOrder', { patientId })}>
              <Text style={styles.actionIcon}>🧪</Text>
              <Text style={styles.actionLabel}>Lab</Text>
            </TouchableOpacity>
          </View>

          {/* Recent Vitals */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Recent Vitals</Text>
            {vitals.length === 0 && <Text style={styles.empty}>No vitals recorded</Text>}
            {vitals.map((v) => (
              <View key={v.id} style={styles.vitalRow}>
                <Text style={styles.vitalType}>{v.type}</Text>
                <Text style={styles.vitalValue}>{v.value} {v.unit}</Text>
              </View>
            ))}
          </View>

          {/* Allergies & Conditions */}
          {(phr?.allergies?.length ?? 0) > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Allergies</Text>
              {phr?.allergies?.map((a, i) => (
                <Text key={`allergy-${String(i)}`} style={styles.listItem}>• {a}</Text>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

interface InfoRowProps {
  readonly label: string;
  readonly value: string;
}

function InfoRow(props: Readonly<InfoRowProps>) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{props.label}</Text>
      <Text style={styles.infoValue}>{props.value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { flex: 1, padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 10 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  infoLabel: { fontSize: 14, color: '#64748b' },
  infoValue: { fontSize: 14, color: '#1e293b', fontWeight: '500' },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 },
  actionBtn: { backgroundColor: '#fff', borderRadius: 12, padding: 14, alignItems: 'center', width: '30%', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  actionIcon: { fontSize: 24, marginBottom: 4 },
  actionLabel: { fontSize: 13, color: '#475569', fontWeight: '600' },
  vitalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  vitalType: { fontSize: 14, color: '#64748b', textTransform: 'capitalize' },
  vitalValue: { fontSize: 14, color: '#1e293b', fontWeight: '600' },
  empty: { fontSize: 13, color: '#94a3b8', fontStyle: 'italic' },
  listItem: { fontSize: 14, color: '#1e293b', marginBottom: 2 },
});
