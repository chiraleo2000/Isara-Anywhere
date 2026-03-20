import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { usePatientApi } from '../../hooks/usePatientApi';
import { AppHeader } from '../../components/common/AppHeader';
import { DoctorCard } from '../../components/cards/DoctorCard';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import type { Doctor } from '../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'BookAppointment'>;

export function BookAppointmentScreen({ navigation, route }: Readonly<Props>) {
  const { getDoctors, bookAppointment, loading } = usePatientApi();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<string | null>(route.params?.doctorId ?? null);

  const loadDoctors = useCallback(async () => {
    const result = await getDoctors();
    if (result?.doctors) {
      setDoctors(result.doctors);
    }
  }, [getDoctors]);

  useEffect(() => {
    void loadDoctors();
  }, [loadDoctors]);

  async function handleBook(): Promise<void> {
    if (!selectedDoctor) {
      Alert.alert('Select Doctor', 'Please choose a doctor first');
      return;
    }
    const result = await bookAppointment({
      doctorId: selectedDoctor,
      date: new Date().toISOString().slice(0, 10),
      time: '10:00',
      reason: 'General consultation',
    });
    if (result) {
      Alert.alert('Success', 'Appointment booked successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader title="Book Appointment" onBack={() => navigation.goBack()} />
      <View style={styles.content}>
        <Text style={styles.label}>Select a Doctor</Text>
        {loading && <LoadingSpinner size="small" />}
        <FlatList
          data={doctors}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.doctorWrapper, selectedDoctor === item.id && styles.selected]}
              onPress={() => setSelectedDoctor(item.id)}
            >
              <DoctorCard doctor={item} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={loading ? null : <EmptyState icon="👨‍⚕️" title="No doctors available" />}
        />
        <TouchableOpacity
          style={[styles.bookButton, !selectedDoctor && styles.bookButtonDisabled]}
          onPress={handleBook}
          disabled={!selectedDoctor}
        >
          <Text style={styles.bookButtonText}>Book Appointment</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { flex: 1, padding: 16 },
  label: { fontSize: 16, fontWeight: '600', color: '#1e293b', marginBottom: 12 },
  doctorWrapper: { borderWidth: 2, borderColor: 'transparent', borderRadius: 14, marginBottom: 4 },
  selected: { borderColor: '#1e40af', backgroundColor: '#eff6ff' },
  bookButton: { backgroundColor: '#1e40af', paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 12 },
  bookButtonDisabled: { backgroundColor: '#94a3b8' },
  bookButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
