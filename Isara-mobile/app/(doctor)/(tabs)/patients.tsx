/**
 * Doctor Patients Tab — Patient list with search
 */

import { useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { doctorApi } from '@izara/api-client';

export default function PatientsScreen() {
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const { data: patients, isLoading, refetch } = useQuery({
    queryKey: ['doctor', 'patients', search],
    queryFn: () => doctorApi.searchPatients(search),
    enabled: search.length === 0 || search.length >= 2,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 ค้นหาผู้ป่วย (ชื่อ, HN, เบอร์โทร)"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Patient List */}
      <ScrollView
        style={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {isLoading && (
          <View style={styles.empty}><Text style={styles.emptyText}>กำลังโหลด...</Text></View>
        )}
        {!isLoading && patients?.length > 0 && (
          patients.map((patient: any) => (
            <TouchableOpacity
              key={patient.id}
              style={styles.card}
              onPress={() => router.push(`/(doctor)/patient/${patient.id}`)}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{patient.first_name?.charAt(0) || '?'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{patient.first_name} {patient.last_name}</Text>
                <Text style={styles.info}>HN: {patient.hn || '-'} • อายุ {patient.age || '-'} ปี</Text>
                {patient.last_visit && <Text style={styles.lastVisit}>มาล่าสุด: {patient.last_visit}</Text>}
              </View>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
          ))
        )}
        {!isLoading && (patients?.length ?? 0) <= 0 && (
          <View style={styles.empty}>
            <Text style={{ fontSize: 40 }}>👥</Text>
            <Text style={styles.emptyText}>
              {search ? 'ไม่พบผู้ป่วยที่ค้นหา' : 'ยังไม่มีรายชื่อผู้ป่วย'}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  searchBar: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  searchInput: { backgroundColor: '#f1f5f9', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15 },
  list: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 8, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1e40af', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  name: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  info: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  lastVisit: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  arrow: { fontSize: 22, color: '#d1d5db' },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { color: '#9ca3af', marginTop: 8 },
});
