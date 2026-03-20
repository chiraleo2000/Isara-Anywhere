import React, { useState } from 'react';
import { Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { useDoctorApi } from '../../hooks/useDoctorApi';
import { AppHeader } from '../../components/common/AppHeader';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

import type { EMRRecord } from '../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'EMREditor'>;

interface EMRForm {
  chiefComplaint: string;
  presentIllness: string;
  physicalExamination: string;
  assessment: string;
  plan: string;
}

export function EMREditorScreen({ navigation, route }: Readonly<Props>) {
  const { patientId } = route.params;
  const { createEMR, loading } = useDoctorApi();
  const [form, setForm] = useState<EMRForm>({
    chiefComplaint: '',
    presentIllness: '',
    physicalExamination: '',
    assessment: '',
    plan: '',
  });

  function updateField(key: keyof EMRForm, value: string): void {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave(): Promise<void> {
    if (!form.chiefComplaint.trim()) {
      Alert.alert('Required', 'Chief complaint is required');
      return;
    }
    const data: Partial<EMRRecord> = {
      patientId,
      chiefComplaint: form.chiefComplaint,
      assessment: form.assessment,
      plan: form.plan,
    };
    const result = await createEMR(data);
    if (result) {
      Alert.alert('Saved', 'EMR record saved successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader
        title="New EMR"
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
          <Text style={styles.label}>Chief Complaint *</Text>
          <TextInput
            style={styles.input}
            value={form.chiefComplaint}
            onChangeText={(t) => updateField('chiefComplaint', t)}
            placeholder="Main patient complaint"
            placeholderTextColor="#94a3b8"
          />

          <Text style={styles.label}>History of Present Illness</Text>
          <TextInput
            style={styles.textArea}
            multiline
            numberOfLines={4}
            value={form.presentIllness}
            onChangeText={(t) => updateField('presentIllness', t)}
            placeholder="Describe the present illness..."
            placeholderTextColor="#94a3b8"
          />

          <Text style={styles.label}>Physical Examination</Text>
          <TextInput
            style={styles.textArea}
            multiline
            numberOfLines={4}
            value={form.physicalExamination}
            onChangeText={(t) => updateField('physicalExamination', t)}
            placeholder="Physical examination findings..."
            placeholderTextColor="#94a3b8"
          />

          <Text style={styles.label}>Assessment / Diagnosis</Text>
          <TextInput
            style={styles.textArea}
            multiline
            numberOfLines={3}
            value={form.assessment}
            onChangeText={(t) => updateField('assessment', t)}
            placeholder="Clinical assessment..."
            placeholderTextColor="#94a3b8"
          />

          <Text style={styles.label}>Plan</Text>
          <TextInput
            style={[styles.textArea, { marginBottom: 40 }]}
            multiline
            numberOfLines={3}
            value={form.plan}
            onChangeText={(t) => updateField('plan', t)}
            placeholder="Treatment plan..."
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
