import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { usePatientApi } from '../../hooks/usePatientApi';
import { AppHeader } from '../../components/common/AppHeader';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import type { TimelineEntry } from '../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Timeline'>;

export function TimelineScreen({ navigation, route }: Readonly<Props>) {
  const { patientId } = route.params;
  const { getTimeline, loading } = usePatientApi();
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const result = await getTimeline(patientId);
    if (result?.timeline) {
      setEntries(result.timeline);
    }
  }, [patientId, getTimeline]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function onRefresh(): Promise<void> {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  function renderEntry({ item }: Readonly<{ item: TimelineEntry }>) {
    return (
      <View style={styles.card}>
        <View style={styles.dot} />
        <View style={styles.cardContent}>
          <Text style={styles.entryType}>{item.type}</Text>
          <Text style={styles.entryTitle}>{item.title}</Text>
          {item.description ? <Text style={styles.entryDesc}>{item.description}</Text> : null}
          <Text style={styles.entryDate}>{new Date(item.date).toLocaleDateString('th-TH')}</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader title="Health Timeline" onBack={() => navigation.goBack()} />
      {loading && !refreshing && <LoadingSpinner />}
      {!loading && (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          renderItem={renderEntry}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<EmptyState icon="📋" title="No timeline entries" message="Your health history will appear here" />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  list: { padding: 16 },
  card: { flexDirection: 'row', marginBottom: 16 },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#1e40af', marginTop: 4, marginRight: 12 },
  cardContent: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  entryType: { fontSize: 11, fontWeight: '600', color: '#1e40af', textTransform: 'uppercase', marginBottom: 2 },
  entryTitle: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  entryDesc: { fontSize: 13, color: '#64748b', marginTop: 2 },
  entryDate: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
});
