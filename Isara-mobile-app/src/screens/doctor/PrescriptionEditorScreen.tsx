import React, { useState } from 'react';
import { Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { useDoctorApi } from '../../hooks/useDoctorApi';
import { AppHeader } from '../../components/common/AppHeader';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import type { Prescription } from '../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'PrescriptionEditor'>;

interface PrescriptionForm {
  drugName: string;
  dosage: string;
  frequency: string;
  duration: string;
  notes: string;
}

export function PrescriptionEditorScreen({ navigation, route }: Readonly<Props>) {
  const { patientId } = route.params;
  const { createPrescription, loading } = useDoctorApi();
  const [form, setForm] = useState<PrescriptionForm>({
    drugName: '',
    dosage: '',
    frequency: '',
    duration: '',
    notes: '',
  });

  function updateField(key: keyof PrescriptionForm, value: string): void {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave(): Promise<void> {
    if (!form.drugName.trim()) {
      Alert.alert('Required', 'Drug name is required');
      return;
    }
    if (!form.dosage.trim()) {
      Alert.alert('Required', 'Dosage is required');
      return;
    }
    const data: Partial<Prescription> = {
      patientId,
      drugName: form.drugName.trim(),
      dosage: form.dosage.trim(),
      frequency: form.frequency.trim(),
      duration: form.duration.trim(),
      notes: form.notes.trim(),
    };
    const result = await createPrescription(data);
    if (result) {
      Alert.alert('Saved', 'Prescription saved', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader
        title="New Prescription"
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity onPress={handleSave}>
            <Text style={styles.saveBtn}>Save</Text>
          </TouchableOpacity>
        }
      />
      {loading && <LoadingSpinner />}
      {!loading && (
        <ScrollView style={styles.scroll}>
          <Text style={styles.label}>Drug Name *</Text>
          <TextInput
            style={styles.input}
            value={form.drugName}
            onChangeText={(t) => updateField('drugName', t)}
            placeholder="e.g. Paracetamol 500mg"
            placeholderTextColor="#94a3b8"
          />

          <Text style={styles.label}>Dosage *</Text>
          <TextInput
            style={styles.input}
            value={form.dosage}
            onChangeText={(t) => updateField('dosage', t)}
            placeholder="e.g. 1 tablet"
            placeholderTextColor="#94a3b8"
          />

          <Text style={styles.label}>Frequency</Text>
          <TextInput
            style={styles.input}
            value={form.frequency}
            onChangeText={(t) => updateField('frequency', t)}
            placeholder="e.g. 3 times daily"
            placeholderTextColor="#94a3b8"
          />

          <Text style={styles.label}>Duration</Text>
          <TextInput
            style={styles.input}
            value={form.duration}
            onChangeText={(t) => updateField('duration', t)}
            placeholder="e.g. 7 days"
            placeholderTextColor="#94a3b8"
          />

          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.textArea, { marginBottom: 40 }]}
            multiline
            numberOfLines={3}
            value={form.notes}
            onChangeText={(t) => updateField('notes', t)}
            placeholder="Special instructions..."
            placeholderTextColor="#94a3b8"
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { flex: 1, padding: 16 },
  saveBtn: { color: '#fff', fontSize: 15, fontWeight: '600' },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 15, color: '#1e293b' },
  textArea: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 15, color: '#1e293b', textAlignVertical: 'top', minHeight: 80 },
});
