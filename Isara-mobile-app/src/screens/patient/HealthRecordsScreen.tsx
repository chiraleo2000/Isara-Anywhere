import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { useAuth } from '../../hooks/useAuth';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function HealthRecordsScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const patientId = user?.id ?? '';

  const sections = [
    { icon: '❤️', title: 'Vitals', desc: 'Track blood pressure, heart rate, weight', screen: 'Vitals' as const },
    { icon: '📋', title: 'Timeline', desc: 'View your complete health history', screen: 'Timeline' as const },
    { icon: '💊', title: 'Prescriptions', desc: 'Active and past medications', screen: 'Prescriptions' as const },
    { icon: '📜', title: 'Living Will', desc: 'Advance care directives', screen: 'LivingWill' as const },
    { icon: '🔒', title: 'PDPA Consent', desc: 'Privacy and consent management', screen: 'PDPAConsent' as const },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Health Records</Text>
      </View>
      <ScrollView style={styles.scroll}>
        {sections.map((section) => (
          <TouchableOpacity
            key={section.screen}
            style={styles.card}
            onPress={() => navigation.navigate(section.screen, { patientId })}
          >
            <Text style={styles.cardIcon}>{section.icon}</Text>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{section.title}</Text>
              <Text style={styles.cardDesc}>{section.desc}</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 16, backgroundColor: '#1e40af' },
  title: { fontSize: 20, fontWeight: '700', color: '#fff' },
  scroll: { flex: 1, padding: 16 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 1 },
  cardIcon: { fontSize: 28, marginRight: 14 },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  cardDesc: { fontSize: 13, color: '#64748b', marginTop: 2 },
  arrow: { fontSize: 24, color: '#94a3b8' },
});
