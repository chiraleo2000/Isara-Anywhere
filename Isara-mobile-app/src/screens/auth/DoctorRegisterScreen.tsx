import React, { useState } from 'react';
import { Text, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { useAuth } from '../../hooks/useAuth';
import { FormInput } from '../../components/forms/FormInput';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

type Props = NativeStackScreenProps<RootStackParamList, 'DoctorRegister'>;

export function DoctorRegisterScreen({ navigation }: Readonly<Props>) {
  const { registerAsDoctor, isLoading } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');

  async function handleRegister(): Promise<void> {
    if (!name.trim() || !email.trim() || !password.trim() || !licenseNumber.trim()) {
      Alert.alert('Validation', 'Please fill in all required fields');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Validation', 'Passwords do not match');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Validation', 'Password must be at least 8 characters');
      return;
    }
    try {
      await registerAsDoctor({
        name: name.trim(),
        email: email.trim(),
        password,
        specialty: specialty.trim(),
        medicalLicenseNumber: licenseNumber.trim(),
      });
      Alert.alert('Registration Submitted', 'Your account will be reviewed and approved by an administrator.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      Alert.alert('Registration Error', message);
    }
  }

  if (isLoading) {
    return <LoadingSpinner message="Creating account..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Doctor Registration</Text>
          <Text style={styles.subtitle}>Register your medical professional account</Text>

          <FormInput label="Full Name" value={name} onChangeText={setName} autoComplete="name" required />
          <FormInput label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" required />
          <FormInput label="License Number" value={licenseNumber} onChangeText={setLicenseNumber} required />
          <FormInput label="Specialty" value={specialty} onChangeText={setSpecialty} />
          <FormInput label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" required />
          <FormInput label="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry required />

          <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
            <Text style={styles.registerButtonText}>Register</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('DoctorLogin')}>
            <Text style={styles.linkText}>Already have an account? Sign In</Text>
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
  content: { flexGrow: 1, paddingHorizontal: 24, justifyContent: 'center', paddingVertical: 24 },
  title: { fontSize: 24, fontWeight: '800', color: '#047857', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 24 },
  registerButton: { backgroundColor: '#047857', paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  registerButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  linkText: { color: '#047857', textAlign: 'center', marginTop: 20, fontSize: 14, fontWeight: '600' },
  back: { alignItems: 'center', marginTop: 16 },
  backText: { fontSize: 14, color: '#64748b' },
});
