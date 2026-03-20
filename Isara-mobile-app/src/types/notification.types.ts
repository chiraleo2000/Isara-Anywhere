export interface Notification {
  id: string;
  type: 'appointment' | 'lab_result' | 'prescription' | 'system' | 'meeting';
  title: string;
  message: string;
  isRead: boolean;
  data?: Record<string, unknown>;
  createdAt: string;
}
