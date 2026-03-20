import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { useDoctorApi } from '../../hooks/useDoctorApi';
import { AppHeader } from '../../components/common/AppHeader';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';

type Props = NativeStackScreenProps<RootStackParamList, 'ClinicalResources'>;

interface ClinicalResource {
  id: string;
  title: string;
  type: string;
}

export function ClinicalResourcesScreen({ navigation }: Readonly<Props>) {
  const { getClinicalResources, loading } = useDoctorApi();
  const [resources, setResources] = useState<ClinicalResource[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const result = await getClinicalResources();
    if (result?.resources) {
      setResources(result.resources);
    }
  }, [getClinicalResources]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function onRefresh(): Promise<void> {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  function renderResource({ item }: Readonly<{ item: ClinicalResource }>) {
    return (
      <View style={styles.card}>
        <Text style={styles.category}>{item.type}</Text>
        <Text style={styles.title}>{item.title}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader title="Clinical Resources" onBack={() => navigation.goBack()} />
      {(loading && !refreshing) && <LoadingSpinner />}
      {!loading && (
        <FlatList
          data={resources}
          keyExtractor={(item) => item.id}
          renderItem={renderResource}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<EmptyState icon="📚" title="No resources" message="Clinical resources will appear here" />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  list: { padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 1 },
  category: { fontSize: 11, fontWeight: '600', color: '#047857', textTransform: 'uppercase', marginBottom: 4 },
  title: { fontSize: 16, fontWeight: '600', color: '#1e293b', marginBottom: 4 },
  content: { fontSize: 14, color: '#64748b', lineHeight: 20 },
});
