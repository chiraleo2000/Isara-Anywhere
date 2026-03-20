import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { useDoctorApi } from '../../hooks/useDoctorApi';
import { AppHeader } from '../../components/common/AppHeader';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

type Props = NativeStackScreenProps<RootStackParamList, 'Availability'>;

interface TimeSlot {
  day: string;
  startTime: string;
  endTime: string;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

export function AvailabilityScreen({ navigation, route }: Readonly<Props>) {
  const { doctorId } = route.params;
  const { getAvailability, updateAvailability, loading } = useDoctorApi();
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const result = await getAvailability(doctorId);
    if (result?.availability) {
      const mapped = result.availability.map((a) => ({
        day: a.day,
        startTime: a.slots[0] ?? '09:00',
        endTime: a.slots.at(-1) ?? '17:00',
      }));
      setSlots(mapped);
    }
  }, [doctorId, getAvailability]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function onRefresh(): Promise<void> {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  function toggleDay(day: string): void {
    setSlots((prev) => {
      const existing = prev.find((s) => s.day === day);
      if (existing) {
        return prev.filter((s) => s.day !== day);
      }
      return [...prev, { day, startTime: '09:00', endTime: '17:00' }];
    });
  }

  async function handleSave(): Promise<void> {
    const data = slots.map((s) => ({ day: s.day, slots: [s.startTime, s.endTime] }));
    const result = await updateAvailability(doctorId, data);
    if (result) {
      Alert.alert('Saved', 'Availability updated successfully');
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader
        title="Availability"
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity onPress={handleSave}>
            <Text style={styles.saveBtn}>Save</Text>
          </TouchableOpacity>
        }
      />
      {(loading && !refreshing) && <LoadingSpinner />}
      {!loading && (
        <ScrollView
          style={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <Text style={styles.heading}>Select Available Days</Text>
          <Text style={styles.info}>Toggle the days you are available for consultations.</Text>

          {DAYS.map((day) => {
            const isActive = slots.some((s) => s.day === day);
            return (
              <TouchableOpacity
                key={day}
                style={[styles.dayRow, isActive && styles.dayActive]}
                onPress={() => toggleDay(day)}
              >
                <View style={[styles.checkbox, isActive && styles.checkboxActive]}>
                  {isActive && <Text style={styles.check}>✓</Text>}
                </View>
                <Text style={[styles.dayText, isActive && styles.dayTextActive]}>{day}</Text>
                {isActive && <Text style={styles.timeText}>09:00 - 17:00</Text>}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { flex: 1, padding: 16 },
  saveBtn: { color: '#fff', fontSize: 15, fontWeight: '600' },
  heading: { fontSize: 20, fontWeight: '700', color: '#1e293b', marginBottom: 6 },
  info: { fontSize: 14, color: '#64748b', marginBottom: 20 },
  dayRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  dayActive: { borderColor: '#047857', backgroundColor: '#f0fdf4' },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#d1d5db', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  checkboxActive: { backgroundColor: '#047857', borderColor: '#047857' },
  check: { color: '#fff', fontSize: 14, fontWeight: '700' },
  dayText: { flex: 1, fontSize: 16, color: '#64748b', fontWeight: '500' },
  dayTextActive: { color: '#1e293b', fontWeight: '600' },
  timeText: { fontSize: 13, color: '#047857', fontWeight: '500' },
});
