import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { usePatientApi } from '../../hooks/usePatientApi';
import { AppHeader } from '../../components/common/AppHeader';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import type { VitalSign } from '../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Vitals'>;

export function VitalsScreen({ navigation, route }: Readonly<Props>) {
  const { patientId } = route.params;
  const { getVitals, loading } = usePatientApi();
  const [vitals, setVitals] = useState<VitalSign[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadVitals = useCallback(async () => {
    const result = await getVitals(patientId);
    if (result?.vitals) {
      setVitals(result.vitals);
    }
  }, [patientId, getVitals]);

  useEffect(() => {
    void loadVitals();
  }, [loadVitals]);

  async function onRefresh(): Promise<void> {
    setRefreshing(true);
    await loadVitals();
    setRefreshing(false);
  }

  function renderVital({ item }: Readonly<{ item: VitalSign }>) {
    return (
      <View style={styles.card}>
        <Text style={styles.type}>{item.type}</Text>
        <Text style={styles.value}>
          {String(item.value)}{item.unit ? ` ${item.unit}` : ''}
        </Text>
        <Text style={styles.date}>{new Date(item.recordedAt).toLocaleDateString('th-TH')}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader title="Vitals" onBack={() => navigation.goBack()} />
      {loading && !refreshing && <LoadingSpinner />}
      {!loading && (
        <FlatList
          data={vitals}
          keyExtractor={(item) => item.id}
          renderItem={renderVital}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<EmptyState icon="❤️" title="No vitals recorded" message="Start tracking your health data" />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  list: { padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 1 },
  type: { fontSize: 14, fontWeight: '600', color: '#1e40af', marginBottom: 4, textTransform: 'capitalize' },
  value: { fontSize: 24, fontWeight: '700', color: '#1e293b' },
  date: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
});
