import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { AppointmentStatus } from '../../types';

type BadgeVariant = AppointmentStatus | 'in-progress' | 'info' | 'success' | 'warning' | 'error';

interface StatusBadgeProps {
  readonly status: BadgeVariant;
  readonly label?: string;
}

const COLORS: Record<BadgeVariant, { bg: string; text: string }> = {
  pending: { bg: '#fef3c7', text: '#92400e' },
  confirmed: { bg: '#dbeafe', text: '#1e40af' },
  completed: { bg: '#dcfce7', text: '#166534' },
  cancelled: { bg: '#fee2e2', text: '#991b1b' },
  'no-show': { bg: '#f1f5f9', text: '#475569' },
  'in-progress': { bg: '#e0e7ff', text: '#3730a3' },
  info: { bg: '#dbeafe', text: '#1e40af' },
  success: { bg: '#dcfce7', text: '#166534' },
  warning: { bg: '#fef3c7', text: '#92400e' },
  error: { bg: '#fee2e2', text: '#991b1b' },
};

export function StatusBadge(props: Readonly<StatusBadgeProps>) {
  const { status, label } = props;
  const displayLabel = label ?? status.replaceAll('_', ' ').replaceAll('-', ' ');
  const colorSet = COLORS[status] ?? COLORS.info;

  return (
    <View style={[styles.badge, { backgroundColor: colorSet.bg }]}>
      <Text style={[styles.text, { color: colorSet.text }]}>
        {displayLabel.charAt(0).toUpperCase() + displayLabel.slice(1)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});
