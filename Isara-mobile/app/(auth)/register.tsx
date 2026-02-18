/**
 * Registration Screen — Shown FIRST for new users (register-first flow)
 * Material Design 3 inspired, Android telemedicine app style
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
  StatusBar,
} from 'react-native';
import { Link, router } from 'expo-router';
import { useAuthStore } from '../../src/stores/authStore';

export default function RegisterScreen() {
  const { register, activeRole } = useAuthStore();
  const isDoctor = activeRole === 'doctor';
  const themeColor = isDoctor ? '#1e40af' : '#0ea5e9';
  const themeColorLight = isDoctor ? '#dbeafe' : '#e0f2fe';
  const roleLabel = isDoctor ? 'แพทย์' : 'ผู้ป่วย';

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
    if (form.password.length < 8) {
      Alert.alert('ข้อผิดพลาด', 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร');
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'กรุณาลองใหม่อีกครั้ง';
      Alert.alert('สมัครสมาชิกไม่สำเร็จ', message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.inner}>
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.roleBadge, { backgroundColor: themeColorLight }]}>
              <Text style={[styles.roleBadgeText, { color: themeColor }]}>
                {isDoctor ? '👨‍⚕️' : '👤'} {roleLabel}
              </Text>
            </View>
            <Text style={[styles.title, { color: themeColor }]}>สร้างบัญชีใหม่</Text>
            <Text style={styles.subtitle}>กรอกข้อมูลเพื่อเริ่มใช้งาน Izara Anywhere</Text>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            {/* Name Row */}
            <View style={styles.row}>
              <View style={styles.halfField}>
                <MaterialInput
                  label="ชื่อ *"
                  value={form.first_name}
                  onChangeText={(v) => updateField('first_name', v)}
                  themeColor={themeColor}
                />
              </View>
              <View style={styles.halfField}>
                <MaterialInput
                  label="นามสกุล *"
                  value={form.last_name}
                  onChangeText={(v) => updateField('last_name', v)}
                  themeColor={themeColor}
                />
              </View>
            </View>

            <MaterialInput
              label="อีเมล *"
              value={form.email}
              onChangeText={(v) => updateField('email', v)}
              keyboardType="email-address"
              autoCapitalize="none"
              themeColor={themeColor}
            />
            <MaterialInput
              label="เบอร์โทรศัพท์ *"
              value={form.phone}
              onChangeText={(v) => updateField('phone', v)}
              keyboardType="phone-pad"
              themeColor={themeColor}
            />
            <MaterialInput
              label="รหัสผ่าน *"
              value={form.password}
              onChangeText={(v) => updateField('password', v)}
              secureTextEntry
              themeColor={themeColor}
            />
            <MaterialInput
              label="ยืนยันรหัสผ่าน *"
              value={form.confirmPassword}
              onChangeText={(v) => updateField('confirmPassword', v)}
              secureTextEntry
              themeColor={themeColor}
            />

            {/* Doctor-specific fields */}
            {isDoctor && (
              <>
                <View style={[styles.sectionDivider, { backgroundColor: themeColor }]} />
                <Text style={[styles.sectionLabel, { color: themeColor }]}>ข้อมูลแพทย์</Text>
                <MaterialInput
                  label="คำนำหน้า"
                  value={form.prefix}
                  onChangeText={(v) => updateField('prefix', v)}
                  placeholder="เช่น นพ., พญ."
                  themeColor={themeColor}
                />
                <MaterialInput
                  label="สาขาเฉพาะทาง *"
                  value={form.specialty}
                  onChangeText={(v) => updateField('specialty', v)}
                  placeholder="เช่น อายุรกรรม"
                  themeColor={themeColor}
                />
                <MaterialInput
                  label="เลขใบอนุญาต *"
                  value={form.license_number}
                  onChangeText={(v) => updateField('license_number', v)}
                  themeColor={themeColor}
                />
              </>
            )}
          </View>

          {/* Register Button - Material Filled Button */}
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: isLoading ? themeColorLight : themeColor }]}
            onPress={handleRegister}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>
              {isLoading ? 'กำลังสมัคร...' : 'สมัครสมาชิก'}
            </Text>
          </TouchableOpacity>

          {/* Existing user → Login */}
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>มีบัญชีอยู่แล้ว? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text style={[styles.switchLink, { color: themeColor }]}>เข้าสู่ระบบ</Text>
              </TouchableOpacity>
            </Link>
          </View>

          {/* Change Role */}
          <TouchableOpacity style={styles.changeRoleBtn} onPress={() => router.back()}>
            <Text style={styles.changeRoleText}>← เปลี่ยนประเภทผู้ใช้</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Material Design 3 outlined text input */
function MaterialInput({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  themeColor = '#0ea5e9',
}: Readonly<{
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences';
  themeColor?: string;
}>) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={inputStyles.container}>
      <Text style={[inputStyles.label, focused && { color: themeColor }]}>{label}</Text>
      <TextInput
        style={[
          inputStyles.input,
          focused && { borderColor: themeColor, borderWidth: 2 },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </View>
  );
}

const inputStyles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#6b7280', marginBottom: 6, marginLeft: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: '#fafafa',
    color: '#1f2937',
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { paddingVertical: 48, paddingHorizontal: 24 },
  inner: {},
  header: { alignItems: 'center', marginBottom: 28 },
  roleBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  roleBadgeText: { fontSize: 14, fontWeight: '700' },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.3 },
  subtitle: { fontSize: 14, color: '#6b7280', marginTop: 6 },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 24,
  },
  row: { flexDirection: 'row', gap: 12 },
  halfField: { flex: 1 },
  sectionDivider: { height: 2, borderRadius: 1, opacity: 0.2, marginVertical: 20 },
  sectionLabel: { fontSize: 16, fontWeight: '700', marginBottom: 16 },
  primaryButton: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: { color: '#ffffff', fontSize: 17, fontWeight: '700' },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 16 },
  switchLabel: { color: '#6b7280', fontSize: 15 },
  switchLink: { fontSize: 15, fontWeight: '700' },
  changeRoleBtn: { alignItems: 'center', paddingVertical: 8 },
  changeRoleText: { color: '#94a3b8', fontSize: 13, fontWeight: '500' },
});
