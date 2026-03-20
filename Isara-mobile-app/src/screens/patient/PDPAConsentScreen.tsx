import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, Switch, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { usePatientApi } from '../../hooks/usePatientApi';
import { AppHeader } from '../../components/common/AppHeader';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

type Props = NativeStackScreenProps<RootStackParamList, 'PDPAConsent'>;

interface ConsentState {
  dataCollection: boolean;
  dataSharing: boolean;
  marketing: boolean;
  research: boolean;
}

export function PDPAConsentScreen({ navigation, route }: Readonly<Props>) {
  const { patientId } = route.params;
  const { getPDPAConsent, savePDPAConsent, loading } = usePatientApi();
  const [consent, setConsent] = useState<ConsentState>({
    dataCollection: false,
    dataSharing: false,
    marketing: false,
    research: false,
  });

  const loadConsent = useCallback(async () => {
    const result = await getPDPAConsent(patientId);
    if (result?.consent) {
      const c = result.consent as Partial<ConsentState>;
      setConsent({
        dataCollection: c.dataCollection ?? false,
        dataSharing: c.dataSharing ?? false,
        marketing: c.marketing ?? false,
        research: c.research ?? false,
      });
    }
  }, [patientId, getPDPAConsent]);

  useEffect(() => {
    void loadConsent();
  }, [loadConsent]);

  async function handleSave(): Promise<void> {
    const result = await savePDPAConsent(patientId, { ...consent });
    if (result) {
      Alert.alert('Saved', 'Your consent preferences have been updated');
    }
  }

  function toggleConsent(key: keyof ConsentState): void {
    setConsent((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader
        title="Privacy & Consent"
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity onPress={handleSave}>
            <Text style={styles.saveText}>Save</Text>
          </TouchableOpacity>
        }
      />
      {loading && <LoadingSpinner />}
      {!loading && (
        <ScrollView style={styles.scroll}>
          <Text style={styles.heading}>PDPA Data Consent</Text>
          <Text style={styles.info}>
            Under Thailand&apos;s Personal Data Protection Act (PDPA), you have the right to control how your personal and health data is used.
          </Text>

          <ConsentRow
            title="Data Collection"
            desc="Allow collection of health records and personal information"
            value={consent.dataCollection}
            onToggle={() => toggleConsent('dataCollection')}
          />
          <ConsentRow
            title="Data Sharing with Doctors"
            desc="Share your health data with assigned healthcare providers"
            value={consent.dataSharing}
            onToggle={() => toggleConsent('dataSharing')}
          />
          <ConsentRow
            title="Marketing Communications"
            desc="Receive health-related news and promotional offers"
            value={consent.marketing}
            onToggle={() => toggleConsent('marketing')}
          />
          <ConsentRow
            title="Research Participation"
            desc="Allow anonymized data use in medical research"
            value={consent.research}
            onToggle={() => toggleConsent('research')}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

interface ConsentRowProps {
  readonly title: string;
  readonly desc: string;
  readonly value: boolean;
  readonly onToggle: () => void;
}

function ConsentRow(props: Readonly<ConsentRowProps>) {
  return (
    <View style={styles.row}>
      <View style={styles.rowInfo}>
        <Text style={styles.rowTitle}>{props.title}</Text>
        <Text style={styles.rowDesc}>{props.desc}</Text>
      </View>
      <Switch
        value={props.value}
        onValueChange={props.onToggle}
        trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
        thumbColor={props.value ? '#1e40af' : '#f4f3f4'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { flex: 1, padding: 16 },
  saveText: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
  heading: { fontSize: 20, fontWeight: '700', color: '#1e293b', marginBottom: 8 },
  info: { fontSize: 14, color: '#64748b', lineHeight: 20, marginBottom: 24 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10 },
  rowInfo: { flex: 1, marginRight: 12 },
  rowTitle: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  rowDesc: { fontSize: 13, color: '#64748b', marginTop: 2 },
});
