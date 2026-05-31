/** Resolve in-app route for a notification click (P3). */
export function getNotificationTarget(notification: { appointmentId?: string }): string {
  if (notification.appointmentId) return `/appointments/${notification.appointmentId}`;
  return '/notifications';
}
