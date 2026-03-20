import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { usePatientApi } from '../../hooks/usePatientApi';
import { AppHeader } from '../../components/common/AppHeader';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';

type Props = NativeStackScreenProps<RootStackParamList, 'MedicalContent'>;

interface ContentItem {
  id: string;
  title: string;
  body: string;
  category: string;
}

export function MedicalContentScreen({ navigation }: Readonly<Props>) {
  const { getMedicalContent, loading } = usePatientApi();
  const [content, setContent] = useState<ContentItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const result = await getMedicalContent();
    if (result?.content) {
      setContent(result.content);
    }
  }, [getMedicalContent]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function onRefresh(): Promise<void> {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  function renderItem({ item }: Readonly<{ item: ContentItem }>) {
    return (
      <View style={styles.card}>
        <Text style={styles.category}>{item.category}</Text>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.body} numberOfLines={3}>{item.body}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader title="Health Information" onBack={() => navigation.goBack()} />
      {loading && !refreshing && <LoadingSpinner />}
      {!loading && (
        <FlatList
          data={content}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<EmptyState icon="📖" title="No articles" message="Health articles will appear here" />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  list: { padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 1 },
  category: { fontSize: 11, fontWeight: '600', color: '#1e40af', textTransform: 'uppercase', marginBottom: 4 },
  title: { fontSize: 16, fontWeight: '600', color: '#1e293b', marginBottom: 4 },
  body: { fontSize: 14, color: '#64748b', lineHeight: 20 },
});
