/**
 * Unified Registration Screen
 * Adapts fields based on activeRole (patient vs doctor)
 */

import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  StyleSheet,
} from 'react-native';
import { Link, router } from 'expo-router';
import { useAuthStore } from '../../src/stores/authStore';

export default function RegisterScreen() {
  const { register, activeRole } = useAuthStore();
  const isDoctor = activeRole === 'doctor';
  const themeColor = isDoctor ? '#1e40af' : '#0ea5e9';

  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    national_id: '',
    // Doctor-specific
    prefix: '',
    specialty: '',
    license_number: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const updateField = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleRegister = async () => {
    if (!form.email || !form.password || !form.first_name || !form.last_name || !form.phone) {
      Alert.alert('ข้อผิดพลาด', 'กรุณากรอกข้อมูลที่จำเป็นให้ครบ');
      return;
    }
    if (form.password !== form.confirmPassword) {
      Alert.alert('ข้อผิดพลาด', 'รหัสผ่านไม่ตรงกัน');
      return;
    }
    if (isDoctor && (!form.license_number || !form.specialty)) {
      Alert.alert('ข้อผิดพลาด', 'กรุณากรอกเลขใบอนุญาตและสาขาเฉพาะทาง');
      return;
    }

    setIsLoading(true);
    try {
      await register(form);
      router.replace(isDoctor ? '/(doctor)/(tabs)' : '/(patient)/(tabs)');
    } catch (error: any) {
      Alert.alert('สมัครสมาชิกไม่สำเร็จ', error.message || 'กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.inner}>
          <Text style={[styles.title, { color: themeColor }]}>
            สมัครสมาชิก{isDoctor ? 'แพทย์' : 'ผู้ป่วย'}
          </Text>
          <Text style={styles.subtitle}>กรอกข้อมูลเพื่อสร้างบัญชี</Text>

          {/* Common Fields */}
          <Field label="อีเมล *" value={form.email} onChangeText={(v) => updateField('email', v)}
            keyboardType="email-address" autoCapitalize="none" />
          <View style={styles.row}>
            <View style={styles.halfField}>
              <Field label="ชื่อ *" value={form.first_name} onChangeText={(v) => updateField('first_name', v)} />
            </View>
            <View style={styles.halfField}>
              <Field label="นามสกุล *" value={form.last_name} onChangeText={(v) => updateField('last_name', v)} />
            </View>
          </View>
          <Field label="เบอร์โทรศัพท์ *" value={form.phone} onChangeText={(v) => updateField('phone', v)}
            keyboardType="phone-pad" />
          <Field label="รหัสผ่าน *" value={form.password} onChangeText={(v) => updateField('password', v)}
            secureTextEntry />
          <Field label="ยืนยันรหัสผ่าน *" value={form.confirmPassword}
            onChangeText={(v) => updateField('confirmPassword', v)} secureTextEntry />

          {/* Doctor-specific fields */}
          {isDoctor && (
            <>
              <View style={[styles.divider, { borderColor: themeColor }]} />
              <Text style={[styles.sectionTitle, { color: themeColor }]}>ข้อมูลแพทย์</Text>
              <Field label="คำนำหน้า" value={form.prefix}
                onChangeText={(v) => updateField('prefix', v)} placeholder="เช่น นพ., พญ." />
              <Field label="สาขาเฉพาะทาง *" value={form.specialty}
                onChangeText={(v) => updateField('specialty', v)} placeholder="เช่น อายุรกรรม" />
              <Field label="เลขใบอนุญาต *" value={form.license_number}
                onChangeText={(v) => updateField('license_number', v)} />
            </>
          )}

          {/* Register Button */}
          <TouchableOpacity
            style={[styles.button, { backgroundColor: themeColor, opacity: isLoading ? 0.6 : 1 }]}
            onPress={handleRegister}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'กำลังสมัคร...' : 'สมัครสมาชิก'}
            </Text>
          </TouchableOpacity>

          <View style={styles.loginRow}>
            <Text style={styles.loginLabel}>มีบัญชีแล้ว? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text style={[styles.loginLink, { color: themeColor }]}>เข้าสู่ระบบ</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences';
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.fieldInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  scrollContent: { paddingVertical: 48, paddingHorizontal: 24 },
  inner: {},
  title: { fontSize: 28, fontWeight: '800', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#6b7280', marginBottom: 32 },
  fieldGroup: { marginBottom: 16 },
  fieldLabel: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 6 },
  fieldInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: '#f9fafb',
  },
  row: { flexDirection: 'row', gap: 12 },
  halfField: { flex: 1 },
  divider: { borderTopWidth: 1, marginVertical: 24, opacity: 0.3 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 16 },
  button: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 8 },
  loginLabel: { color: '#6b7280', fontSize: 14 },
  loginLink: { fontSize: 14, fontWeight: '600' },
});
