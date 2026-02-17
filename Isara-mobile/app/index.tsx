/**
 * Izara Anywhere — Role Selection Screen
 * Entry point: Users pick Patient or Doctor role
 * 
 * Corresponds to Phase 2 doc: S01 - Role Selection
 */

import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../src/stores/authStore';
import { useEffect } from 'react';

export default function RoleSelectionScreen() {
  const { isAuthenticated, activeRole, lastActiveRole } = useAuthStore();

  // Auto-redirect if already authenticated with a saved role
  useEffect(() => {
    if (isAuthenticated && lastActiveRole) {
      if (lastActiveRole === 'doctor') {
        router.replace('/(doctor)/(tabs)');
      } else {
        router.replace('/(patient)/(tabs)');
      }
    }
  }, [isAuthenticated, lastActiveRole]);

  const handleSelectRole = (role: 'patient' | 'doctor') => {
    useAuthStore.getState().setActiveRole(role);
    if (isAuthenticated) {
      router.replace(role === 'doctor' ? '/(doctor)/(tabs)' : '/(patient)/(tabs)');
    } else {
      router.push('/(auth)/login');
    }
  };

  return (
    <View style={styles.container}>
      {/* Logo */}
      <View style={styles.header}>
        <Text style={styles.logo}>🏥</Text>
        <Text style={styles.title}>Izara Anywhere</Text>
        <Text style={styles.subtitle}>ระบบการแพทย์ทางไกล</Text>
        <Text style={styles.subtitleEn}>Telemedicine Platform</Text>
      </View>

      {/* Role Cards */}
      <View style={styles.cardsContainer}>
        {/* Patient Card */}
        <TouchableOpacity
          style={[styles.card, styles.patientCard]}
          onPress={() => handleSelectRole('patient')}
          activeOpacity={0.8}
        >
          <Text style={styles.cardIcon}>👤</Text>
          <Text style={styles.cardTitle}>ผู้ป่วย</Text>
          <Text style={styles.cardTitleEn}>Patient</Text>
          <Text style={styles.cardDesc}>
            นัดหมายแพทย์ ดูผลตรวจ{'\n'}จัดการสุขภาพของคุณ
          </Text>
          <View style={[styles.cardButton, styles.patientButton]}>
            <Text style={styles.cardButtonText}>เข้าใช้งาน →</Text>
          </View>
        </TouchableOpacity>

        {/* Doctor Card */}
        <TouchableOpacity
          style={[styles.card, styles.doctorCard]}
          onPress={() => handleSelectRole('doctor')}
          activeOpacity={0.8}
        >
          <Text style={styles.cardIcon}>👨‍⚕️</Text>
          <Text style={styles.cardTitle}>แพทย์</Text>
          <Text style={styles.cardTitleEn}>Doctor</Text>
          <Text style={styles.cardDesc}>
            จัดการนัดหมาย ดูแลผู้ป่วย{'\n'}บันทึกทางการแพทย์
          </Text>
          <View style={[styles.cardButton, styles.doctorButton]}>
            <Text style={styles.cardButtonText}>เข้าใช้งาน →</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <Text style={styles.footer}>v2.0.0 • Phase 2 • Dev Testing</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    fontSize: 64,
    marginBottom: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 4,
  },
  subtitleEn: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 2,
  },
  cardsContainer: {
    gap: 16,
  },
  card: {
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  patientCard: {
    backgroundColor: '#ffffff',
    borderLeftWidth: 4,
    borderLeftColor: '#0ea5e9',
  },
  doctorCard: {
    backgroundColor: '#ffffff',
    borderLeftWidth: 4,
    borderLeftColor: '#1e40af',
  },
  cardIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
  },
  cardTitleEn: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 8,
  },
  cardDesc: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 22,
    marginBottom: 16,
  },
  cardButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  patientButton: {
    backgroundColor: '#0ea5e9',
  },
  doctorButton: {
    backgroundColor: '#1e40af',
  },
  cardButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 48,
  },
});
