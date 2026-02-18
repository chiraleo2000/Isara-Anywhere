/**
 * Login Screen — Material Design 3 inspired
 * For returning users (register-first flow puts this secondary)
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
import * as LocalAuthentication from 'expo-local-authentication';
import { useAuthStore } from '../../src/stores/authStore';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const { login, loginWithBiometric, hasBiometricCredentials, activeRole } = useAuthStore();

  const isDoctor = activeRole === 'doctor';
  const themeColor = isDoctor ? '#1e40af' : '#0ea5e9';
  const themeColorLight = isDoctor ? '#dbeafe' : '#e0f2fe';
  const roleLabel = isDoctor ? 'แพทย์' : 'ผู้ป่วย';

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('ข้อผิดพลาด', 'กรุณากรอกอีเมลและรหัสผ่าน');
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password);
      router.replace(isDoctor ? '/(doctor)/(tabs)' : '/(patient)/(tabs)');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'กรุณาตรวจสอบอีเมลและรหัสผ่านของคุณ';
      Alert.alert('เข้าสู่ระบบไม่สำเร็จ', message);
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'การยืนยันตัวตนล้มเหลว';
      Alert.alert('ข้อผิดพลาด', message);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.inner}>
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.logoWrap, { backgroundColor: themeColor }]}>
              <Text style={styles.logoEmoji}>{isDoctor ? '👨‍⚕️' : '👤'}</Text>
            </View>
            <Text style={[styles.appName, { color: themeColor }]}>
              {isDoctor ? 'Izara Doctor' : 'Izara Patient'}
            </Text>
            <Text style={styles.subtitle}>ยินดีต้อนรับกลับ</Text>
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

          {/* Form Card */}
          <View style={styles.formCard}>
            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, emailFocused && { color: themeColor }]}>อีเมล</Text>
              <TextInput
                style={[styles.input, emailFocused && { borderColor: themeColor, borderWidth: 2 }]}
                placeholder="your@email.com"
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                value={email}
                onChangeText={setEmail}
                editable={!isLoading}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, passwordFocused && { color: themeColor }]}>รหัสผ่าน</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[
                    styles.input,
                    styles.passwordInput,
                    passwordFocused && { borderColor: themeColor, borderWidth: 2 },
                  ]}
                  placeholder="••••••••"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  value={password}
                  onChangeText={setPassword}
                  editable={!isLoading}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                />
                <TouchableOpacity
                  style={styles.showPasswordBtn}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Text style={[styles.showPasswordText, { color: themeColor }]}>
                    {showPassword ? '🙈' : '👁️'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Login Button - Material Filled */}
          <TouchableOpacity
            style={[styles.loginButton, { backgroundColor: isLoading ? themeColorLight : themeColor }]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <Text style={styles.loginButtonText}>
              {isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </Text>
          </TouchableOpacity>

          {/* Biometric Login - Material Outlined */}
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

          {/* Register Link (prominent for register-first flow) */}
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
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center' },
  inner: { paddingHorizontal: 24, paddingVertical: 32 },
  header: { alignItems: 'center', marginBottom: 28 },
  logoWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  logoEmoji: { fontSize: 36 },
  appName: { fontSize: 26, fontWeight: '800', letterSpacing: -0.3 },
  subtitle: { fontSize: 15, color: '#6b7280', marginTop: 6, fontWeight: '500' },
  roleBadge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginBottom: 20,
  },
  roleBadgeText: { fontSize: 14, fontWeight: '700' },
  switchLink: { fontSize: 13, fontWeight: '600' },
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
  inputGroup: { marginBottom: 16 },
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
  passwordContainer: { position: 'relative' },
  passwordInput: { paddingRight: 52 },
  showPasswordBtn: { position: 'absolute', right: 16, top: 14 },
  showPasswordText: { fontSize: 18 },
  loginButton: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonText: { color: '#ffffff', fontSize: 17, fontWeight: '700' },
  biometricButton: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 2,
    marginBottom: 24,
    backgroundColor: '#ffffff',
  },
  biometricText: { fontSize: 16, fontWeight: '600' },
  registerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 8 },
  registerLabel: { color: '#6b7280', fontSize: 15 },
  registerLink: { fontSize: 15, fontWeight: '700' },
});
