import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { usePatientApi } from '../../hooks/usePatientApi';
import { AppHeader } from '../../components/common/AppHeader';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import type { Prescription } from '../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Prescriptions'>;

export function PrescriptionsScreen({ navigation, route }: Readonly<Props>) {
  const { patientId } = route.params;
  const { getPrescriptions, loading } = usePatientApi();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const result = await getPrescriptions(patientId);
    if (result?.prescriptions) {
      setPrescriptions(result.prescriptions);
    }
  }, [patientId, getPrescriptions]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function onRefresh(): Promise<void> {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  function renderPrescription({ item }: Readonly<{ item: Prescription }>) {
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.drugName}>{item.drugName}</Text>
          <Text style={styles.duration}>{item.duration}</Text>
        </View>
        <Text style={styles.dosage}>{item.dosage} — {item.frequency}</Text>
        {item.notes ? <Text style={styles.instructions}>{item.notes}</Text> : null}
        <Text style={styles.date}>Prescribed: {new Date(item.prescribedAt).toLocaleDateString('th-TH')}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader title="Prescriptions" onBack={() => navigation.goBack()} />
      {loading && !refreshing && <LoadingSpinner />}
      {!loading && (
        <FlatList
          data={prescriptions}
          keyExtractor={(item) => item.id}
          renderItem={renderPrescription}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<EmptyState icon="💊" title="No prescriptions" message="Your prescriptions will appear here" />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  list: { padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  drugName: { fontSize: 16, fontWeight: '600', color: '#1e293b', flex: 1, marginRight: 8 },
  duration: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  dosage: { fontSize: 14, color: '#475569', marginBottom: 4 },
  instructions: { fontSize: 13, color: '#64748b', fontStyle: 'italic', marginBottom: 4 },
  date: { fontSize: 12, color: '#94a3b8' },
});
