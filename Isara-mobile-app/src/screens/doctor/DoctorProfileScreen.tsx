import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { useAuth } from '../../hooks/useAuth';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function DoctorProfileScreen() {
  const navigation = useNavigation<Nav>();
  const { user, logout } = useAuth();

  function handleLogout(): void {
    Alert.alert('Logout', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => { logout(); } },
    ]);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(user?.name ?? 'D').charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>Dr. {user?.name ?? 'Doctor'}</Text>
        <Text style={styles.email}>{user?.email ?? ''}</Text>
      </View>
      <ScrollView style={styles.scroll}>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Availability', { doctorId: user?.id ?? '' })}>
          <Text style={styles.menuIcon}>📅</Text>
          <Text style={styles.menuText}>Manage Availability</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('ClinicalResources')}>
          <Text style={styles.menuIcon}>📚</Text>
          <Text style={styles.menuText}>Clinical Resources</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Settings')}>
          <Text style={styles.menuIcon}>⚙️</Text>
          <Text style={styles.menuText}>Settings</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('AIAssistant')}>
          <Text style={styles.menuIcon}>🤖</Text>
          <Text style={styles.menuText}>AI Assistant</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.menuItem, styles.logoutItem]} onPress={handleLogout}>
          <Text style={styles.menuIcon}>🚪</Text>
          <Text style={[styles.menuText, styles.logoutText]}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { backgroundColor: '#047857', alignItems: 'center', padding: 24, paddingBottom: 28 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#ffffff25', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { fontSize: 28, fontWeight: '700', color: '#fff' },
  name: { fontSize: 20, fontWeight: '700', color: '#fff' },
  email: { fontSize: 14, color: '#a7f3d0', marginTop: 2 },
  scroll: { flex: 1, padding: 16 },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1 },
  menuIcon: { fontSize: 22, marginRight: 14 },
  menuText: { flex: 1, fontSize: 16, color: '#1e293b', fontWeight: '500' },
  menuArrow: { fontSize: 22, color: '#94a3b8' },
  logoutItem: { marginTop: 16 },
  logoutText: { color: '#dc2626' },
});
