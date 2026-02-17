/**
 * Patient Profile Tab — Account info, settings, role switching
 */

import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../../../src/stores/authStore';

function MenuItem({ icon, label, onPress, danger }: {
  icon: string; label: string; onPress: () => void; danger?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <Text style={styles.menuIcon}>{icon}</Text>
      <Text style={[styles.menuLabel, danger && { color: '#ef4444' }]}>{label}</Text>
      <Text style={styles.menuArrow}>›</Text>
    </TouchableOpacity>
  );
}

export default function PatientProfileScreen() {
  const { user, logout, switchRole } = useAuthStore();

  const handleLogout = () => {
    Alert.alert('ออกจากระบบ', 'คุณต้องการออกจากระบบหรือไม่?', [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ออกจากระบบ',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/');
        },
      },
    ]);
  };

  const handleSwitchToDoctor = () => {
    Alert.alert('เปลี่ยนเป็นโหมดแพทย์', 'คุณจะต้องเข้าสู่ระบบด้วยบัญชีแพทย์', [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'เปลี่ยน',
        onPress: async () => {
          await switchRole('doctor');
          router.replace('/');
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.first_name?.charAt(0) || '?'}
          </Text>
        </View>
        <Text style={styles.name}>{user?.first_name} {user?.last_name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>ผู้ป่วย</Text>
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>บัญชี</Text>
        <MenuItem icon="👤" label="แก้ไขโปรไฟล์" onPress={() => {}} />
        <MenuItem icon="🔒" label="เปลี่ยนรหัสผ่าน" onPress={() => {}} />
        <MenuItem icon="🔐" label="ไบโอเมตริกซ์" onPress={() => {}} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>ตั้งค่า</Text>
        <MenuItem icon="🔔" label="การแจ้งเตือน" onPress={() => router.push('/settings/notifications')} />
        <MenuItem icon="🔗" label="เชื่อมต่อบริการ" onPress={() => router.push('/settings/connections')} />
        <MenuItem icon="🛡️" label="ความเป็นส่วนตัว" onPress={() => router.push('/settings/privacy')} />
        <MenuItem icon="🌐" label="ภาษา" onPress={() => {}} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>อื่นๆ</Text>
        <MenuItem icon="👨‍⚕️" label="เปลี่ยนเป็นโหมดแพทย์" onPress={handleSwitchToDoctor} />
        <MenuItem icon="📖" label="เกี่ยวกับ" onPress={() => {}} />
        <MenuItem icon="🚪" label="ออกจากระบบ" onPress={handleLogout} danger />
      </View>

      <Text style={styles.version}>v2.0.0 • Phase 2</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { alignItems: 'center', paddingVertical: 32, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#0ea5e9', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: '700' },
  name: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  email: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  roleBadge: { backgroundColor: '#e0f2fe', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4, marginTop: 8 },
  roleText: { color: '#0ea5e9', fontSize: 12, fontWeight: '600' },
  section: { paddingHorizontal: 16, paddingTop: 24 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: '#9ca3af', marginBottom: 8, textTransform: 'uppercase' },
  menuItem: { backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 6 },
  menuIcon: { fontSize: 20, marginRight: 14 },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '500', color: '#0f172a' },
  menuArrow: { fontSize: 20, color: '#d1d5db' },
  version: { textAlign: 'center', color: '#9ca3af', fontSize: 12, padding: 24 },
});
