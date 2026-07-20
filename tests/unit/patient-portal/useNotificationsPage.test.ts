import { describe, expect, it } from 'vitest';
import {
  getNotificationsPageLabels,
  notificationRowClass,
} from '../../../../issara-patient/frontend/hooks/useNotificationsPageHelpers';

describe('useNotificationsPage helpers (G1)', () => {
  it('returns English labels when language is en', () => {
    const labels = getNotificationsPageLabels('en');
    expect(labels.title).toBe('Notifications');
    expect(labels.markAll).toBe('Mark all as read');
  });

  it('returns Thai labels when language is th', () => {
    const labels = getNotificationsPageLabels('th');
    expect(labels.title).toBe('การแจ้งเตือน');
  });

  it('applies unread highlight class in dark mode', () => {
    expect(notificationRowClass(false, true)).toContain('bg-emerald-950');
  });

  it('applies read row styling in light mode', () => {
    expect(notificationRowClass(true, false)).not.toContain('bg-emerald-950');
  });
});
