import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { useDoctorApi } from '../../hooks/useDoctorApi';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface PatientSummary {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  lastVisit?: string;
}

export function PatientsScreen() {
  const navigation = useNavigation<Nav>();
  const { getPatients, loading } = useDoctorApi();
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [filtered, setFiltered] = useState<PatientSummary[]>([]);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const result = await getPatients();
    if (result?.patients) {
      setPatients(result.patients);
      setFiltered(result.patients);
    }
  }, [getPatients]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (search.trim() === '') {
      setFiltered(patients);
    } else {
      const q = search.toLowerCase();
      setFiltered(patients.filter((p) => p.name.toLowerCase().includes(q)));
    }
  }, [search, patients]);

  async function onRefresh(): Promise<void> {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  function renderPatient({ item }: Readonly<{ item: PatientSummary }>) {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('PatientDetail', { patientId: item.id })}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{item.name}</Text>
          {item.email ? <Text style={styles.sub}>{item.email}</Text> : null}
          {item.lastVisit ? (
            <Text style={styles.sub}>Last visit: {item.lastVisit}</Text>
          ) : null}
        </View>
        <Text style={styles.arrow}>›</Text>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Patients</Text>
      </View>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search patients..."
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {(loading && !refreshing) && <LoadingSpinner />}

      {!loading && (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderPatient}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<EmptyState icon="👥" title="No patients found" />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 16, backgroundColor: '#047857' },
  title: { fontSize: 20, fontWeight: '700', color: '#fff' },
  searchBar: { padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  searchInput: { backgroundColor: '#f1f5f9', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: '#1e293b' },
  list: { padding: 16 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#d1fae5', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#047857' },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  sub: { fontSize: 13, color: '#64748b', marginTop: 2 },
  arrow: { fontSize: 22, color: '#94a3b8' },
});
