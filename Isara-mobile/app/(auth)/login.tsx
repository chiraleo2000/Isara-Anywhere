/**
 * Unified Login Screen — Handles both Patient and Doctor authentication
 * Role-aware UI theming and API client selection
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
import * as LocalAuthentication from 'expo-local-authentication';
import { useAuthStore } from '../../src/stores/authStore';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { login, loginWithBiometric, hasBiometricCredentials, activeRole } = useAuthStore();

  const isDoctor = activeRole === 'doctor';
  const themeColor = isDoctor ? '#1e40af' : '#0ea5e9';
  const themeColorLight = isDoctor ? '#dbeafe' : '#e0f2fe';
  const roleLabel = isDoctor ? 'แพทย์' : 'ผู้ป่วย';
  const appLabel = isDoctor ? 'Izara Doctor' : 'Izara Patient';

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('ข้อผิดพลาด', 'กรุณากรอกอีเมลและรหัสผ่าน');
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password);
      router.replace(isDoctor ? '/(doctor)/(tabs)' : '/(patient)/(tabs)');
    } catch (error: any) {
      Alert.alert(
        'เข้าสู่ระบบไม่สำเร็จ',
        error.message || 'กรุณาตรวจสอบอีเมลและรหัสผ่านของคุณ'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        Alert.alert('ไม่รองรับ', 'อุปกรณ์ของคุณไม่รองรับการยืนยันตัวตนด้วยไบโอเมตริกซ์');
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'เข้าสู่ระบบด้วยไบโอเมตริกซ์',
        cancelLabel: 'ยกเลิก',
        disableDeviceFallback: false,
        fallbackLabel: 'ใช้รหัสผ่าน',
      });

      if (result.success) {
        await loginWithBiometric();
        router.replace(isDoctor ? '/(doctor)/(tabs)' : '/(patient)/(tabs)');
      }
    } catch (error: any) {
      Alert.alert('ข้อผิดพลาด', error.message || 'การยืนยันตัวตนล้มเหลว');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.inner}>
          {/* Logo & Branding */}
          <View style={styles.header}>
            <Text style={styles.logoEmoji}>{isDoctor ? '👨‍⚕️' : '👤'}</Text>
            <Text style={[styles.appName, { color: themeColor }]}>{appLabel}</Text>
            <Text style={styles.subtitle}>เข้าสู่ระบบ{roleLabel}เพื่อดำเนินการต่อ</Text>
          </View>

          {/* Role Badge */}
          <View style={[styles.roleBadge, { backgroundColor: themeColorLight }]}>
            <Text style={[styles.roleBadgeText, { color: themeColor }]}>
              โหมด{roleLabel}
            </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={[styles.switchLink, { color: themeColor }]}>เปลี่ยนโหมด</Text>
            </TouchableOpacity>
          </View>

          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>อีเมล</Text>
            <TextInput
              style={styles.input}
              placeholder="your@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              value={email}
              onChangeText={setEmail}
              editable={!isLoading}
            />
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>รหัสผ่าน</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="••••••••"
                secureTextEntry={!showPassword}
                autoComplete="password"
                value={password}
                onChangeText={setPassword}
                editable={!isLoading}
              />
              <TouchableOpacity
                style={styles.showPasswordBtn}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text style={[styles.showPasswordText, { color: themeColor }]}>
                  {showPassword ? 'ซ่อน' : 'แสดง'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginButton, { backgroundColor: isLoading ? themeColorLight : themeColor }]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <Text style={styles.loginButtonText}>
              {isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </Text>
          </TouchableOpacity>

          {/* Biometric Login */}
          {hasBiometricCredentials && (
            <TouchableOpacity
              style={[styles.biometricButton, { borderColor: themeColor }]}
              onPress={handleBiometricLogin}
            >
              <Text style={[styles.biometricText, { color: themeColor }]}>
                🔐 เข้าสู่ระบบด้วยไบโอเมตริกซ์
              </Text>
            </TouchableOpacity>
          )}

          {/* Register Link */}
          <View style={styles.registerRow}>
            <Text style={styles.registerLabel}>ยังไม่มีบัญชี? </Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity>
                <Text style={[styles.registerLink, { color: themeColor }]}>สมัครสมาชิก</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center' },
  inner: { paddingHorizontal: 24, paddingVertical: 32 },
  header: { alignItems: 'center', marginBottom: 32 },
  logoEmoji: { fontSize: 64, marginBottom: 8 },
  appName: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: '#6b7280', marginTop: 8 },
  roleBadge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 24,
  },
  roleBadgeText: { fontSize: 14, fontWeight: '600' },
  switchLink: { fontSize: 12, fontWeight: '500' },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: '#f9fafb',
  },
  passwordContainer: { position: 'relative' },
  passwordInput: { paddingRight: 60 },
  showPasswordBtn: { position: 'absolute', right: 16, top: 14 },
  showPasswordText: { fontSize: 14, fontWeight: '500' },
  loginButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  loginButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  biometricButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 24,
  },
  biometricText: { fontSize: 16, fontWeight: '600' },
  registerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 16 },
  registerLabel: { color: '#6b7280', fontSize: 14 },
  registerLink: { fontSize: 14, fontWeight: '600' },
});
