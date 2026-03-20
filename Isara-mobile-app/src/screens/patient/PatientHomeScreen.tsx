import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { useAuth } from '../../hooks/useAuth';
import { usePatientApi } from '../../hooks/usePatientApi';
import { AppointmentCard } from '../../components/cards/AppointmentCard';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import type { Appointment } from '../../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function PatientHomeScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const { getUpcomingAppointments, loading } = usePatientApi();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const result = await getUpcomingAppointments();
    if (result?.appointments) {
      setAppointments(result.appointments.slice(0, 3));
    }
  }, [getUpcomingAppointments]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function onRefresh(): Promise<void> {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.greeting}>
          <Text style={styles.greetingText}>
            Welcome back, {user?.name ?? 'Patient'} 👋
          </Text>
          <Text style={styles.subGreeting}>How are you feeling today?</Text>
        </View>

        <View style={styles.quickActions}>
          <QuickActionButton icon="📅" label="Book" onPress={() => navigation.navigate('BookAppointment', {})} />
          <QuickActionButton icon="❤️" label="Vitals" onPress={() => navigation.navigate('Vitals', { patientId: user?.id ?? '' })} />
          <QuickActionButton icon="💊" label="Meds" onPress={() => navigation.navigate('Prescriptions', { patientId: user?.id ?? '' })} />
          <QuickActionButton icon="🤖" label="AI Help" onPress={() => navigation.navigate('AIAssistant')} />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
            <TouchableOpacity onPress={() => navigation.getParent()?.navigate('Appointments')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          {loading && <LoadingSpinner size="small" />}
          {!loading && appointments.length === 0 && (
            <Text style={styles.emptyText}>No upcoming appointments</Text>
          )}
          {appointments.map((appt) => (
            <AppointmentCard
              key={appt.id}
              appointment={appt}
              onPress={(a) => navigation.navigate('AppointmentDetail', { appointmentId: a.id })}
            />
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Links</Text>
          <View style={styles.linkGrid}>
            <LinkCard icon="📋" label="Timeline" onPress={() => navigation.navigate('Timeline', { patientId: user?.id ?? '' })} />
            <LinkCard icon="🧪" label="Lab Results" onPress={() => (navigation as { navigate: (screen: string) => void }).navigate('HealthRecords')} />
            <LinkCard icon="📖" label="Health Info" onPress={() => navigation.navigate('MedicalContent')} />
            <LinkCard icon="🔒" label="PDPA" onPress={() => navigation.navigate('PDPAConsent', { patientId: user?.id ?? '' })} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

interface QuickActionButtonProps {
  readonly icon: string;
  readonly label: string;
  readonly onPress: () => void;
}

function QuickActionButton(props: Readonly<QuickActionButtonProps>) {
  return (
    <TouchableOpacity style={styles.quickAction} onPress={props.onPress}>
      <Text style={styles.quickIcon}>{props.icon}</Text>
      <Text style={styles.quickLabel}>{props.label}</Text>
    </TouchableOpacity>
  );
}

interface LinkCardProps {
  readonly icon: string;
  readonly label: string;
  readonly onPress: () => void;
}

function LinkCard(props: Readonly<LinkCardProps>) {
  return (
    <TouchableOpacity style={styles.linkCard} onPress={props.onPress}>
      <Text style={styles.linkIcon}>{props.icon}</Text>
      <Text style={styles.linkLabel}>{props.label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { flex: 1 },
  greeting: { padding: 20, backgroundColor: '#1e40af', paddingBottom: 24 },
  greetingText: { fontSize: 22, fontWeight: '700', color: '#ffffff' },
  subGreeting: { fontSize: 14, color: '#bfdbfe', marginTop: 4 },
  quickActions: { flexDirection: 'row', justifyContent: 'space-around', padding: 16, backgroundColor: '#ffffff', marginBottom: 8 },
  quickAction: { alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12 },
  quickIcon: { fontSize: 28, marginBottom: 4 },
  quickLabel: { fontSize: 12, color: '#475569', fontWeight: '600' },
  section: { padding: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 12 },
  seeAll: { fontSize: 14, color: '#1e40af', fontWeight: '600' },
  emptyText: { fontSize: 14, color: '#94a3b8', textAlign: 'center', paddingVertical: 20 },
  linkGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  linkCard: { width: '47%', backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  linkIcon: { fontSize: 28, marginBottom: 6 },
  linkLabel: { fontSize: 13, color: '#475569', fontWeight: '600' },
});
