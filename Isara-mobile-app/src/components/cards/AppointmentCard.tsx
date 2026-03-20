import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { StatusBadge } from '../common/StatusBadge';
import type { Appointment } from '../../types';

interface AppointmentCardProps {
  readonly appointment: Appointment;
  readonly onPress?: (appointment: Appointment) => void;
}

export function AppointmentCard(props: Readonly<AppointmentCardProps>) {
  const { appointment, onPress } = props;

  const formattedDate = new Date(appointment.date).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress?.(appointment)}
      disabled={!onPress}
    >
      <View style={styles.header}>
        <Text style={styles.doctorName}>
          {appointment.doctorName || 'Pending Assignment'}
        </Text>
        <StatusBadge status={appointment.status} />
      </View>
      {appointment.specialty ? (
        <Text style={styles.specialty}>{appointment.specialty}</Text>
      ) : null}
      <View style={styles.footer}>
        <Text style={styles.date}>{formattedDate}</Text>
        {appointment.time ? (
          <Text style={styles.time}>{appointment.time}</Text>
        ) : null}
      </View>
      {appointment.reason ? (
        <Text style={styles.reason} numberOfLines={2}>{appointment.reason}</Text>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
    marginRight: 8,
  },
  specialty: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  date: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  time: {
    fontSize: 13,
    color: '#475569',
    marginLeft: 12,
  },
  reason: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 6,
    fontStyle: 'italic',
  },
});
