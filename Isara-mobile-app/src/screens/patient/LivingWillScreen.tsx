import React, { useEffect, useState, useCallback } from 'react';
import { Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { usePatientApi } from '../../hooks/usePatientApi';
import { AppHeader } from '../../components/common/AppHeader';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
type Props = NativeStackScreenProps<RootStackParamList, 'LivingWill'>;

interface LivingWillFormState {
  carePreferences: string;
  emergencyContact: string;
  notes: string;
}

export function LivingWillScreen({ navigation, route }: Readonly<Props>) {
  const { patientId } = route.params;
  const { getLivingWill, saveLivingWill, loading } = usePatientApi();
  const [will, setWill] = useState<LivingWillFormState>({ carePreferences: '', emergencyContact: '', notes: '' });
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const result = await getLivingWill(patientId);
    if (result?.livingWill) {
      const prefs = result.livingWill.preferences ?? {};
      setWill({
        carePreferences: typeof prefs.carePreferences === 'string' ? prefs.carePreferences : '',
        emergencyContact: typeof prefs.emergencyContact === 'string' ? prefs.emergencyContact : '',
        notes: typeof prefs.notes === 'string' ? prefs.notes : '',
      });
    }
  }, [patientId, getLivingWill]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleSave(): Promise<void> {
    const result = await saveLivingWill(patientId, { preferences: { ...will } });
    if (result) {
      Alert.alert('Saved', 'Your living will has been saved successfully');
    }
  }

  async function onRefresh(): Promise<void> {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader
        title="Living Will"
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity onPress={handleSave}>
            <Text style={styles.saveButton}>Save</Text>
          </TouchableOpacity>
        }
      />
      {loading && !refreshing && <LoadingSpinner />}
      {!loading && (
        <ScrollView
          style={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <Text style={styles.sectionTitle}>Advance Care Directives</Text>
          <Text style={styles.desc}>
            Document your healthcare preferences in case you become unable to communicate your wishes.
          </Text>

          <Text style={styles.label}>Care Preferences</Text>
          <TextInput
            style={styles.textArea}
            multiline
            numberOfLines={6}
            value={will.carePreferences}
            onChangeText={(t) => setWill((prev) => ({ ...prev, carePreferences: t }))}
            placeholder="Describe your care preferences..."
            placeholderTextColor="#94a3b8"
          />

          <Text style={styles.label}>Emergency Contact</Text>
          <TextInput
            style={styles.input}
            value={will.emergencyContact}
            onChangeText={(t) => setWill((prev) => ({ ...prev, emergencyContact: t }))}
            placeholder="Name and phone number"
            placeholderTextColor="#94a3b8"
          />

          <Text style={styles.label}>Additional Notes</Text>
          <TextInput
            style={styles.textArea}
            multiline
            numberOfLines={4}
            value={will.notes}
            onChangeText={(t) => setWill((prev) => ({ ...prev, notes: t }))}
            placeholder="Any additional notes..."
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
  saveButton: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b', marginBottom: 6 },
  desc: { fontSize: 14, color: '#64748b', marginBottom: 20, lineHeight: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 15, color: '#1e293b' },
  textArea: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 15, color: '#1e293b', textAlignVertical: 'top', minHeight: 100 },
});
