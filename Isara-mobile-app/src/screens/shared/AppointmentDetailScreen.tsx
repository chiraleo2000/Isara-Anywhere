import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { useAuth } from '../../hooks/useAuth';
import { usePatientApi } from '../../hooks/usePatientApi';
import { StatusBadge } from '../../components/common/StatusBadge';
import { AppHeader } from '../../components/common/AppHeader';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import type { Appointment } from '../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'AppointmentDetail'>;

export function AppointmentDetailScreen({ navigation, route }: Readonly<Props>) {
  const { appointmentId } = route.params;
  const { role } = useAuth();
  const { getAppointment, cancelAppointment, loading } = usePatientApi();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const result = await getAppointment(appointmentId);
    if (result?.appointment) {
      setAppointment(result.appointment);
    }
  }, [appointmentId, getAppointment]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function onRefresh(): Promise<void> {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  function handleJoinMeeting(): void {
    if (appointment?.meetLink) {
      navigation.navigate('Meeting', {
        meetingId: appointment.id,
        jitsiUrl: appointment.meetLink,
      });
    }
  }

  function handleCancel(): void {
    Alert.alert('Cancel Appointment', 'Are you sure you want to cancel this appointment?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await cancelAppointment(appointmentId);
            navigation.goBack();
          })();
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader title="Appointment Detail" onBack={() => navigation.goBack()} />
      {(loading && !refreshing) && <LoadingSpinner />}
      {(!loading && appointment) && (
        <ScrollView
          style={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.label}>Status</Text>
              <StatusBadge status={appointment?.status ?? 'pending'} />
            </View>
            <View style={styles.divider} />

            <Text style={styles.label}>Date</Text>
            <Text style={styles.value}>
              {appointment ? new Date(appointment.date).toLocaleDateString('th-TH') : ''}
            </Text>

            <Text style={styles.label}>Time</Text>
            <Text style={styles.value}>{appointment?.time ?? '-'}</Text>

            {role === 'patient' && (
              <>
                <Text style={styles.label}>Doctor</Text>
                <Text style={styles.value}>{appointment?.doctorName ?? '-'}</Text>
              </>
            )}

            {role === 'doctor' && (
              <>
                <Text style={styles.label}>Patient</Text>
                <Text style={styles.value}>{appointment?.patientName ?? '-'}</Text>
              </>
            )}

            {appointment?.specialty ? (
              <>
                <Text style={styles.label}>Specialty</Text>
                <Text style={styles.value}>{appointment?.specialty}</Text>
              </>
            ) : null}

            {appointment?.reason ? (
              <>
                <Text style={styles.label}>Reason</Text>
                <Text style={styles.value}>{appointment?.reason}</Text>
              </>
            ) : null}

            {appointment?.notes ? (
              <>
                <Text style={styles.label}>Notes</Text>
                <Text style={styles.value}>{appointment?.notes}</Text>
              </>
            ) : null}
          </View>

          {appointment?.status === 'confirmed' && appointment?.meetLink && (
            <TouchableOpacity style={styles.joinBtn} onPress={handleJoinMeeting}>
              <Text style={styles.joinBtnText}>Join Video Meeting</Text>
            </TouchableOpacity>
          )}

          {role === 'patient' && appointment?.status === 'pending' && (
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
              <Text style={styles.cancelBtnText}>Cancel Appointment</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { flex: 1, padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  divider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 12 },
  label: { fontSize: 12, fontWeight: '600', color: '#64748b', textTransform: 'uppercase', marginTop: 12, marginBottom: 4 },
  value: { fontSize: 16, color: '#1e293b', marginBottom: 4 },
  joinBtn: { backgroundColor: '#047857', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  joinBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: { backgroundColor: '#fff', padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#ef4444', marginBottom: 40 },
  cancelBtnText: { color: '#ef4444', fontSize: 16, fontWeight: '600' },
});
