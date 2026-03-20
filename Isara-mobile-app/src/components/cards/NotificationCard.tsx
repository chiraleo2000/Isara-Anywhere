import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Notification } from '../../types';

interface NotificationCardProps {
  readonly notification: Notification;
  readonly onPress?: (notification: Notification) => void;
}

export function NotificationCard(props: Readonly<NotificationCardProps>) {
  const { notification, onPress } = props;

  const timeAgo = getTimeAgo(notification.createdAt);

  return (
    <TouchableOpacity
      style={[styles.card, !notification.isRead && styles.unread]}
      onPress={() => onPress?.(notification)}
      disabled={!onPress}
    >
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>{notification.title}</Text>
        {!notification.isRead && <View style={styles.dot} />}
      </View>
      <Text style={styles.body} numberOfLines={2}>{notification.message}</Text>
      <Text style={styles.time}>{timeAgo}</Text>
    </TouchableOpacity>
  );
}

function getTimeAgo(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr = Math.floor(diffMs / 3_600_000);
  const diffDay = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${String(diffMin)}m ago`;
  if (diffHr < 24) return `${String(diffHr)}h ago`;
  if (diffDay < 7) return `${String(diffDay)}d ago`;
  return new Date(dateString).toLocaleDateString('th-TH');
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  unread: {
    backgroundColor: '#eff6ff',
    borderLeftColor: '#1e40af',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1e40af',
    marginLeft: 8,
  },
  body: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 6,
  },
  time: {
    fontSize: 11,
    color: '#94a3b8',
  },
});
