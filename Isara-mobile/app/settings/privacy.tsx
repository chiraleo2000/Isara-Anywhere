/**
 * Privacy Settings — Data sharing, session management
 */

import { View, Text, ScrollView, Switch, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useState } from 'react';
import { useAuthStore } from '../../src/stores/authStore';

export default function PrivacySettingsScreen() {
  const { activeRole } = useAuthStore();
  const themeColor = activeRole === 'doctor' ? '#1e40af' : '#0ea5e9';

  const [shareHealth, setShareHealth] = useState(true);
  const [shareAnalytics, setShareAnalytics] = useState(false);
  const [twoFactor, setTwoFactor] = useState(false);

  const handleDeleteData = () => {
    Alert.alert(
      'ลบข้อมูลทั้งหมด',
      'การดำเนินการนี้ไม่สามารถย้อนกลับได้ ข้อมูลทั้งหมดจะถูกลบอย่างถาวร',
      [
        { text: 'ยกเลิก', style: 'cancel' },
        { text: 'ลบทั้งหมด', style: 'destructive', onPress: () => {} },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>การแชร์ข้อมูล</Text>

        <View style={styles.item}>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemLabel}>แชร์ข้อมูลสุขภาพกับแพทย์</Text>
            <Text style={styles.itemDesc}>อนุญาตให้แพทย์ที่ดูแลเข้าถึงข้อมูลสุขภาพ</Text>
          </View>
          <Switch value={shareHealth} onValueChange={setShareHealth} trackColor={{ true: themeColor }} />
        </View>

        <View style={styles.item}>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemLabel}>ข้อมูลวิเคราะห์</Text>
            <Text style={styles.itemDesc}>ช่วยปรับปรุงแอปด้วยข้อมูลการใช้งานที่ไม่ระบุตัวตน</Text>
          </View>
          <Switch value={shareAnalytics} onValueChange={setShareAnalytics} trackColor={{ true: themeColor }} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ความปลอดภัย</Text>

        <View style={styles.item}>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemLabel}>ยืนยันตัวตน 2 ขั้นตอน</Text>
            <Text style={styles.itemDesc}>เพิ่มความปลอดภัยด้วย OTP ทุกครั้งที่เข้าสู่ระบบ</Text>
          </View>
          <Switch value={twoFactor} onValueChange={setTwoFactor} trackColor={{ true: themeColor }} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ข้อมูลส่วนตัว</Text>
        <TouchableOpacity style={styles.textBtn}>
          <Text style={styles.textBtnLabel}>📥 ดาวน์โหลดข้อมูลทั้งหมด</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dangerBtn} onPress={handleDeleteData}>
          <Text style={styles.dangerBtnText}>🗑️ ลบข้อมูลทั้งหมด</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#9ca3af', marginBottom: 12, textTransform: 'uppercase' },
  item: { backgroundColor: '#fff', borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  itemLabel: { fontSize: 15, fontWeight: '500', color: '#0f172a' },
  itemDesc: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  textBtn: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 8 },
  textBtnLabel: { fontSize: 15, fontWeight: '500', color: '#0f172a' },
  dangerBtn: { backgroundColor: '#fef2f2', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#fecaca' },
  dangerBtnText: { fontSize: 15, fontWeight: '500', color: '#ef4444' },
});
