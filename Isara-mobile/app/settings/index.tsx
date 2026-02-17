/**
 * Settings Index — General settings screen
 */

import { View, Text, ScrollView, TouchableOpacity, Switch, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/stores/authStore';

export default function SettingsScreen() {
  const { activeRole } = useAuthStore();
  const themeColor = activeRole === 'doctor' ? '#1e40af' : '#0ea5e9';

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>การแจ้งเตือน</Text>
        <TouchableOpacity style={styles.item} onPress={() => router.push('/settings/notifications')}>
          <Text style={styles.itemIcon}>🔔</Text>
          <Text style={styles.itemLabel}>ตั้งค่าการแจ้งเตือน</Text>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>การเชื่อมต่อ</Text>
        <TouchableOpacity style={styles.item} onPress={() => router.push('/settings/connections')}>
          <Text style={styles.itemIcon}>🔗</Text>
          <Text style={styles.itemLabel}>เชื่อมต่อบริการภายนอก</Text>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ความเป็นส่วนตัว</Text>
        <TouchableOpacity style={styles.item} onPress={() => router.push('/settings/privacy')}>
          <Text style={styles.itemIcon}>🛡️</Text>
          <Text style={styles.itemLabel}>การตั้งค่าความเป็นส่วนตัว</Text>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>แอปพลิเคชัน</Text>
        <View style={styles.item}>
          <Text style={styles.itemIcon}>🌙</Text>
          <Text style={[styles.itemLabel, { flex: 1 }]}>โหมดมืด</Text>
          <Switch value={false} trackColor={{ true: themeColor }} disabled />
        </View>
        <View style={styles.item}>
          <Text style={styles.itemIcon}>🌐</Text>
          <Text style={styles.itemLabel}>ภาษา</Text>
          <Text style={styles.itemValue}>ไทย</Text>
        </View>
        <View style={styles.item}>
          <Text style={styles.itemIcon}>📱</Text>
          <Text style={styles.itemLabel}>เวอร์ชัน</Text>
          <Text style={styles.itemValue}>2.0.0</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  section: { paddingHorizontal: 16, paddingTop: 24 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#9ca3af', marginBottom: 8, textTransform: 'uppercase' },
  item: { backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 6 },
  itemIcon: { fontSize: 20, marginRight: 14 },
  itemLabel: { flex: 1, fontSize: 15, fontWeight: '500', color: '#0f172a' },
  itemValue: { fontSize: 14, color: '#6b7280' },
  arrow: { fontSize: 20, color: '#d1d5db' },
});
