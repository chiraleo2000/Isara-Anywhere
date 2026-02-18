/**
 * Izara Anywhere — Welcome / Role Selection Screen
 * Smart auth routing:
 *   - First-time users → Register (onboarding flow)
 *   - Returning users  → Login (direct access)
 * Material Design 3 inspired, Android telemedicine app style
 */

import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../src/stores/authStore';
import { useEffect } from 'react';

export default function WelcomeScreen() {
  const { isAuthenticated, lastActiveRole, onboardingCompleted } = useAuthStore();

  // Auto-redirect if already authenticated with a saved role
  useEffect(() => {
    if (isAuthenticated && lastActiveRole) {
      router.replace(lastActiveRole === 'doctor' ? '/(doctor)/(tabs)' : '/(patient)/(tabs)');
    }
  }, [isAuthenticated, lastActiveRole]);

  const handleSelectRole = (role: 'patient' | 'doctor') => {
    useAuthStore.getState().setActiveRole(role);
    if (isAuthenticated) {
      router.replace(role === 'doctor' ? '/(doctor)/(tabs)' : '/(patient)/(tabs)');
    } else if (onboardingCompleted) {
      // Returning user — go directly to login
      router.push('/(auth)/login');
    } else {
      // New user — register first (onboarding)
      router.push('/(auth)/register');
    }
  };

  // Returning users who have registered before: show Login as primary action
  const isReturningUser = onboardingCompleted && !isAuthenticated;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0284c7" />

      {/* Hero Section — Material Design 3 branding */}
      <View style={styles.heroSection}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoIcon}>🩺</Text>
        </View>
        <Text style={styles.appName}>Izara Anywhere</Text>
        <Text style={styles.tagline}>การแพทย์ทางไกล ทุกที่ ทุกเวลา</Text>
        <Text style={styles.taglineEn}>Telemedicine • Anytime • Anywhere</Text>
      </View>

      {/* Feature Chips — Compact horizontal layout */}
      <View style={styles.featureStrip}>
        <FeatureChip icon="📅" label="นัดหมาย" />
        <FeatureChip icon="📹" label="วิดีโอคอล" />
        <FeatureChip icon="📋" label="ผลตรวจ" />
        <FeatureChip icon="💊" label="ยา" />
        <FeatureChip icon="🤖" label="AI แพทย์" />
      </View>

      {/* Role Selection — Material Card layout */}
      <View style={styles.roleSection}>
        <Text style={styles.sectionTitle}>เลือกประเภทผู้ใช้</Text>
        <View style={styles.roleCards}>
          <TouchableOpacity
            style={[styles.roleCard, styles.patientCard]}
            onPress={() => handleSelectRole('patient')}
            activeOpacity={0.8}
          >
            <View style={styles.roleCardContent}>
              <View style={[styles.roleIconWrap, { backgroundColor: '#e0f2fe' }]}>
                <Text style={styles.roleIcon}>👤</Text>
              </View>
              <View style={styles.roleTextWrap}>
                <Text style={styles.roleTitle}>ผู้ป่วย</Text>
                <Text style={styles.roleDesc}>นัดหมาย ปรึกษาแพทย์ ดูผลลัพธ์</Text>
              </View>
            </View>
            <View style={[styles.roleArrow, { backgroundColor: '#0ea5e9' }]}>
              <Text style={styles.arrowText}>→</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.roleCard, styles.doctorCard]}
            onPress={() => handleSelectRole('doctor')}
            activeOpacity={0.8}
          >
            <View style={styles.roleCardContent}>
              <View style={[styles.roleIconWrap, { backgroundColor: '#dbeafe' }]}>
                <Text style={styles.roleIcon}>👨‍⚕️</Text>
              </View>
              <View style={styles.roleTextWrap}>
                <Text style={styles.roleTitle}>แพทย์</Text>
                <Text style={styles.roleDesc}>จัดการนัด ตรวจผู้ป่วย สั่งยา</Text>
              </View>
            </View>
            <View style={[styles.roleArrow, { backgroundColor: '#1e40af' }]}>
              <Text style={styles.arrowText}>→</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Auth Section — Smart routing based on returning/new user */}
      <View style={styles.authSection}>
        {isReturningUser ? (
          <>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.push('/(auth)/login')}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>เข้าสู่ระบบ</Text>
            </TouchableOpacity>
            <View style={styles.authRow}>
              <Text style={styles.authLabel}>บัญชีใหม่? </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                <Text style={styles.authLink}>สมัครสมาชิก</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={styles.authRow}>
            <Text style={styles.authLabel}>มีบัญชีอยู่แล้ว? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.authLink}>เข้าสู่ระบบ</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Text style={styles.footer}>v2.0.0 • Izara Telemedicine • Phase 1</Text>
    </View>
  );
}

function FeatureChip({ icon, label }: Readonly<{ icon: string; label: string }>) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipIcon}>{icon}</Text>
      <Text style={styles.chipLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },

  // Hero
  heroSection: {
    backgroundColor: '#0284c7',
    paddingTop: 56,
    paddingBottom: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    marginBottom: 16,
  },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoIcon: {
    fontSize: 36,
  },
  appName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
    fontWeight: '500',
  },
  taglineEn: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  // Feature Chips
  featureStrip: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 24,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  chipIcon: {
    fontSize: 16,
  },
  chipLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },

  // Role Section
  roleSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  roleCards: {
    gap: 12,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  patientCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#0ea5e9',
  },
  doctorCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#1e40af',
  },
  roleCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  roleIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleIcon: {
    fontSize: 24,
  },
  roleTextWrap: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
  },
  roleDesc: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  roleArrow: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },

  // Auth Section
  authSection: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#0ea5e9',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  authRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  authLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  authLink: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0ea5e9',
  },

  // Footer
  footer: {
    textAlign: 'center',
    color: '#cbd5e1',
    fontSize: 11,
    paddingBottom: 16,
  },
});
