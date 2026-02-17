/**
 * Patient Health Tab — Health records, vitals, medications overview
 */

import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { patientApi } from '@izara/api-client';

function HealthCard({ icon, title, subtitle, onPress }: {
  icon: string; title: string; subtitle: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <Text style={styles.cardIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSubtitle}>{subtitle}</Text>
      </View>
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );
}

export default function HealthScreen() {
  const { data: records } = useQuery({
    queryKey: ['patient', 'health', 'records'],
    queryFn: () => patientApi.getHealthRecords(),
  });

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ข้อมูลสุขภาพ</Text>
        <HealthCard icon="📊" title="สัญญาณชีพ" subtitle="ตรวจสอบชีพจร ความดัน อุณหภูมิ"
          onPress={() => router.push('/(patient)/health/vitals')} />
        <HealthCard icon="💊" title="รายการยา" subtitle="ยาที่กำลังใช้งานและประวัติ"
          onPress={() => router.push('/(patient)/health/medications')} />
        <HealthCard icon="🏥" title="เวชระเบียน (EMR)" subtitle={`${records?.length || 0} รายการ`}
          onPress={() => {}} />
        <HealthCard icon="🧪" title="ผลแล็บ" subtitle="ผลตรวจเลือด ผลตรวจทั่วไป"
          onPress={() => {}} />
        <HealthCard icon="💉" title="ประวัติวัคซีน" subtitle="บันทึกการฉีดวัคซีน"
          onPress={() => {}} />
        <HealthCard icon="🩺" title="โรคประจำตัว" subtitle="ข้อมูลโรคประจำตัวและการแพ้ยา"
          onPress={() => {}} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  section: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 16 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#f1f5f9' },
  cardIcon: { fontSize: 28, marginRight: 14 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  cardSubtitle: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  arrow: { fontSize: 24, color: '#d1d5db', fontWeight: '300' },
});
