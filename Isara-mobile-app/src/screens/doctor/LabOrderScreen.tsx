import React, { useState } from 'react';
import { Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { useDoctorApi } from '../../hooks/useDoctorApi';
import { AppHeader } from '../../components/common/AppHeader';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import type { LabOrder as LabOrderType } from '../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'LabOrder'>;

export function LabOrderScreen({ navigation, route }: Readonly<Props>) {
  const { patientId } = route.params;
  const { createLabOrder, loading } = useDoctorApi();
  const [testName, setTestName] = useState('');
  const [notes, setNotes] = useState('');

  async function handleOrder(): Promise<void> {
    if (!testName.trim()) {
      Alert.alert('Required', 'Test name is required');
      return;
    }
    const data: Partial<LabOrderType> = { patientId, testName: testName.trim() };
    const result = await createLabOrder(data);
    if (result) {
      Alert.alert('Ordered', 'Lab test ordered successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader
        title="Order Lab Test"
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity onPress={handleOrder}>
            <Text style={styles.saveBtn}>Order</Text>
          </TouchableOpacity>
        }
      />
      {loading && <LoadingSpinner />}
      {!loading && (
        <ScrollView style={styles.scroll}>
          <Text style={styles.label}>Test Name *</Text>
          <TextInput
            style={styles.input}
            value={testName}
            onChangeText={setTestName}
            placeholder="e.g. CBC, Lipid Panel, HbA1c"
            placeholderTextColor="#94a3b8"
          />

          <Text style={styles.label}>Clinical Notes</Text>
          <TextInput
            style={styles.textArea}
            multiline
            numberOfLines={4}
            value={notes}
            onChangeText={setNotes}
            placeholder="Reason for ordering, special instructions..."
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
  textArea: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 15, color: '#1e293b', textAlignVertical: 'top', minHeight: 100 },
});
