import { describe, expect, it } from 'vitest';
import { getNotificationTarget } from '../../../Isara-patient-portal/frontend/utils/notificationRouting';

describe('notification bell routing behavior (P3)', () => {
  it('routes appointment notifications to appointment detail', () => {
    expect(getNotificationTarget({ appointmentId: 'apt-42' })).toBe('/appointments/apt-42');
  });

  it('routes non-appointment notifications to notifications page', () => {
    expect(getNotificationTarget({})).toBe('/notifications');
    expect(getNotificationTarget({ appointmentId: undefined })).toBe('/notifications');
  });
});
