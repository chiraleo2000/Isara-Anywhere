import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

export function WelcomeScreen({ navigation }: Readonly<Props>) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoEmoji}>🏥</Text>
          <Text style={styles.title}>Isara Telemedicine</Text>
          <Text style={styles.subtitle}>
            Your health, anywhere. Connect with doctors, manage records, and receive care from home.
          </Text>
        </View>

        <View style={styles.features}>
          <FeatureItem icon="📹" text="Video consultations" />
          <FeatureItem icon="📋" text="Health records & vitals" />
          <FeatureItem icon="💊" text="Prescriptions & lab orders" />
          <FeatureItem icon="🤖" text="AI health assistant" />
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('RoleSelect')}
          >
            <Text style={styles.primaryButtonText}>Get Started</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

interface FeatureItemProps {
  readonly icon: string;
  readonly text: string;
}

function FeatureItem(props: Readonly<FeatureItemProps>) {
  return (
    <View style={styles.featureRow}>
      <Text style={styles.featureIcon}>{props.icon}</Text>
      <Text style={styles.featureText}>{props.text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1e40af',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  features: {
    marginBottom: 40,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 14,
  },
  featureText: {
    fontSize: 16,
    color: '#334155',
  },
  actions: {
    paddingHorizontal: 16,
  },
  primaryButton: {
    backgroundColor: '#1e40af',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
});
