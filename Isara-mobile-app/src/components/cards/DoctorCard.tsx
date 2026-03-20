import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Doctor } from '../../types';

interface DoctorCardProps {
  readonly doctor: Doctor;
  readonly onPress?: (doctor: Doctor) => void;
}

export function DoctorCard(props: Readonly<DoctorCardProps>) {
  const { doctor, onPress } = props;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress?.(doctor)}
      disabled={!onPress}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {doctor.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{doctor.name}</Text>
        {doctor.specialty ? (
          <Text style={styles.specialty}>{doctor.specialty}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1e40af',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  specialty: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
});
