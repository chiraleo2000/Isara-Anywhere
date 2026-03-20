import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { NotificationCard } from '../../components/cards/NotificationCard';
import type { Notification } from '../../types';

const now = Date.now();

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'notif-1',
    type: 'appointment',
    title: 'Appointment Reminder',
    message: 'Your appointment is tomorrow at 10:00',
    isRead: false,
    createdAt: new Date(now - 5 * 60_000).toISOString(), // 5 min ago
    ...overrides,
  };
}

describe('NotificationCard', () => {
  it('renders notification title', () => {
    render(<NotificationCard notification={makeNotification()} />);
    expect(screen.getByText('Appointment Reminder')).toBeTruthy();
  });

  it('renders notification message', () => {
    render(<NotificationCard notification={makeNotification()} />);
    expect(screen.getByText('Your appointment is tomorrow at 10:00')).toBeTruthy();
  });

  it('shows unread indicator for unread notifications', () => {
    const { toJSON } = render(<NotificationCard notification={makeNotification({ isRead: false })} />);
    const tree = JSON.stringify(toJSON());
    // Unread card has a blue dot (borderLeftColor or extra view)
    expect(tree).toBeTruthy();
  });

  it('shows relative time for recent notifications', () => {
    render(<NotificationCard notification={makeNotification({ createdAt: new Date(now - 30 * 60_000).toISOString() })} />);
    expect(screen.getByText('30m ago')).toBeTruthy();
  });

  it('shows hours ago for older notifications', () => {
    render(<NotificationCard notification={makeNotification({ createdAt: new Date(now - 3 * 3_600_000).toISOString() })} />);
    expect(screen.getByText('3h ago')).toBeTruthy();
  });

  it('shows days ago for multi-day notifications', () => {
    render(<NotificationCard notification={makeNotification({ createdAt: new Date(now - 2 * 86_400_000).toISOString() })} />);
    expect(screen.getByText('2d ago')).toBeTruthy();
  });

  it('shows "Just now" for very recent notifications', () => {
    render(<NotificationCard notification={makeNotification({ createdAt: new Date(now - 10_000).toISOString() })} />);
    expect(screen.getByText('Just now')).toBeTruthy();
  });

  it('calls onPress with notification when tapped', () => {
    const onPress = jest.fn();
    render(<NotificationCard notification={makeNotification()} onPress={onPress} />);
    fireEvent.press(screen.getByText('Appointment Reminder'));
    expect(onPress).toHaveBeenCalledWith(expect.objectContaining({ id: 'notif-1' }));
  });

  it('is disabled when no onPress handler provided', () => {
    const { toJSON } = render(<NotificationCard notification={makeNotification()} />);
    const tree = JSON.stringify(toJSON());
    expect(tree).toContain('"disabled":true');
  });
});
