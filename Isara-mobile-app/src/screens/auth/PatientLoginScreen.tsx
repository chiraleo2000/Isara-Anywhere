import React, { useState } from 'react';
import { Text, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { useAuth } from '../../hooks/useAuth';
import { FormInput } from '../../components/forms/FormInput';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

type Props = NativeStackScreenProps<RootStackParamList, 'PatientLogin'>;

export function PatientLoginScreen({ navigation }: Readonly<Props>) {
  const { loginAsPatient, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function handleLogin(): Promise<void> {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Validation', 'Please enter email and password');
      return;
    }
    try {
      await loginAsPatient(email.trim(), password);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      Alert.alert('Login Error', message);
    }
  }

  if (isLoading) {
    return <LoadingSpinner message="Signing in..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Patient Login</Text>
          <Text style={styles.subtitle}>Sign in with your patient account</Text>

          <FormInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            required
          />
          <FormInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            required
          />

          <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
            <Text style={styles.loginButtonText}>Sign In</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('PatientRegister')}>
            <Text style={styles.linkText}>Don&apos;t have an account? Register</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  flex: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 24, justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: '800', color: '#1e40af', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 32 },
  loginButton: { backgroundColor: '#1e40af', paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  loginButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  linkText: { color: '#1e40af', textAlign: 'center', marginTop: 20, fontSize: 14, fontWeight: '600' },
  back: { alignItems: 'center', marginTop: 16 },
  backText: { fontSize: 14, color: '#64748b' },
});
