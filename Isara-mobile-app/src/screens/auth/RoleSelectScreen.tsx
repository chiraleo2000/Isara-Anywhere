import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'RoleSelect'>;

export function RoleSelectScreen({ navigation }: Readonly<Props>) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>I am a...</Text>
        <Text style={styles.subtitle}>Choose your role to continue</Text>

        <TouchableOpacity
          style={[styles.roleCard, styles.patientCard]}
          onPress={() => navigation.navigate('PatientLogin')}
        >
          <Text style={styles.roleIcon}>🧑‍⚕️</Text>
          <Text style={styles.roleTitle}>Patient</Text>
          <Text style={styles.roleDesc}>Book appointments, view health records, and consult with doctors</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.roleCard, styles.doctorCard]}
          onPress={() => navigation.navigate('DoctorLogin')}
        >
          <Text style={styles.roleIcon}>👨‍⚕️</Text>
          <Text style={styles.roleTitle}>Doctor</Text>
          <Text style={styles.roleDesc}>Manage patients, write EMRs, prescriptions, and conduct consultations</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backLink}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 32,
  },
  roleCard: {
    padding: 24,
    borderRadius: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  patientCard: {
    backgroundColor: '#eff6ff',
    borderWidth: 2,
    borderColor: '#bfdbfe',
  },
  doctorCard: {
    backgroundColor: '#ecfdf5',
    borderWidth: 2,
    borderColor: '#a7f3d0',
  },
  roleIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  roleTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  roleDesc: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
  },
  backLink: {
    alignItems: 'center',
    marginTop: 24,
  },
  backText: {
    fontSize: 15,
    color: '#1e40af',
    fontWeight: '600',
  },
});
