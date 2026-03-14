// ============================================================================
// Notification System Workflow Tests — Patient & Doctor Portals
// Based on: Processes/Notification_Workflows.md
// Tests: Notification types, channels, preferences, read/unread, filtering
// ============================================================================

import { describe, it, expect } from 'vitest';

// --- Types ---

type NotificationChannel = 'in_app' | 'email' | 'push' | 'sms';
type NotificationType = 
  | 'appointment_requested' | 'appointment_confirmed' | 'appointment_declined'
  | 'appointment_cancelled' | 'appointment_assigned' | 'appointment_reminder'
  | 'meeting_link_ready' | 'meeting_starting' | 'meeting_completed'
  | 'emr_available' | 'prescription_ready' | 'lab_results_ready'
  | 'system_update' | 'security_alert' | 'content_approved' | 'content_rejected';

interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  titleTh: string;
  message: string;
  messageTh: string;
  channels: NotificationChannel[];
  read: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  link?: string;
  createdAt: string;
}

interface NotificationPreferences {
  userId: string;
  appointments: boolean;
  meetings: boolean;
  emr: boolean;
  system: boolean;
  marketing: boolean;
  channels: {
    inApp: boolean;
    email: boolean;
    push: boolean;
    sms: boolean;
  };
}

// --- Constants ---

const APPOINTMENT_TYPES: NotificationType[] = [
  'appointment_requested', 'appointment_confirmed', 'appointment_declined',
  'appointment_cancelled', 'appointment_assigned', 'appointment_reminder',
];

const MEETING_TYPES: NotificationType[] = [
  'meeting_link_ready', 'meeting_starting', 'meeting_completed',
];

const CLINICAL_TYPES: NotificationType[] = [
  'emr_available', 'prescription_ready', 'lab_results_ready',
];

const SYSTEM_TYPES: NotificationType[] = [
  'system_update', 'security_alert', 'content_approved', 'content_rejected',
];

const ALL_TYPES: NotificationType[] = [...APPOINTMENT_TYPES, ...MEETING_TYPES, ...CLINICAL_TYPES, ...SYSTEM_TYPES];

// --- Helper Functions ---

function generateNotificationId(): string {
  return `NOTIF-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

function getNotificationPriority(type: NotificationType): 'low' | 'medium' | 'high' | 'urgent' {
  if (type === 'security_alert') return 'urgent';
  if (['meeting_starting', 'appointment_reminder'].includes(type)) return 'high';
  if (['appointment_confirmed', 'meeting_link_ready', 'emr_available'].includes(type)) return 'medium';
  return 'low';
}

function shouldSendChannel(type: NotificationType, channel: NotificationChannel, prefs: NotificationPreferences): boolean {
  const channelMap: Record<NotificationChannel, boolean> = {
    in_app: prefs.channels.inApp,
    email: prefs.channels.email,
    push: prefs.channels.push,
    sms: prefs.channels.sms,
  };
  const channelEnabled = channelMap[channel] ?? false;
  
  if (!channelEnabled) return false;

  if (APPOINTMENT_TYPES.includes(type)) return prefs.appointments;
  if (MEETING_TYPES.includes(type)) return prefs.meetings;
  if (CLINICAL_TYPES.includes(type)) return prefs.emr;
  if (SYSTEM_TYPES.includes(type)) return prefs.system;
  return false;
}

function getUnreadCount(notifications: Notification[]): number {
  return notifications.filter(n => !n.read).length;
}

function filterByType(notifications: Notification[], types: NotificationType[]): Notification[] {
  return notifications.filter(n => types.includes(n.type));
}

function sortByDate(notifications: Notification[], order: 'asc' | 'desc' = 'desc'): Notification[] {
  return [...notifications].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return order === 'desc' ? dateB - dateA : dateA - dateB;
  });
}

function markAsRead(notification: Notification): Notification {
  return { ...notification, read: true };
}

function markAllAsRead(notifications: Notification[]): Notification[] {
  return notifications.map(n => ({ ...n, read: true }));
}

function getTypeCategory(type: NotificationType): string {
  if (APPOINTMENT_TYPES.includes(type)) return 'appointment';
  if (MEETING_TYPES.includes(type)) return 'meeting';
  if (CLINICAL_TYPES.includes(type)) return 'clinical';
  if (SYSTEM_TYPES.includes(type)) return 'system';
  return 'unknown';
}

function getThaiTypeLabel(type: NotificationType): string {
  const labels: Record<string, string> = {
    appointment_requested: 'ขอนัดหมายใหม่',
    appointment_confirmed: 'ยืนยันนัดหมาย',
    appointment_declined: 'ปฏิเสธนัดหมาย',
    appointment_cancelled: 'ยกเลิกนัดหมาย',
    appointment_assigned: 'มอบหมายนัดหมาย',
    appointment_reminder: 'เตือนนัดหมาย',
    meeting_link_ready: 'ลิงก์ประชุมพร้อม',
    meeting_starting: 'การประชุมเริ่มแล้ว',
    meeting_completed: 'ประชุมเสร็จสิ้น',
    emr_available: 'เวชระเบียนพร้อม',
    prescription_ready: 'ใบสั่งยาพร้อม',
    lab_results_ready: 'ผลแล็บพร้อม',
    system_update: 'อัปเดทระบบ',
    security_alert: 'แจ้งเตือนความปลอดภัย',
    content_approved: 'เนื้อหาได้รับอนุมัติ',
    content_rejected: 'เนื้อหาถูกปฏิเสธ',
  };
  return labels[type] || type;
}

// --- Tests ---

describe('Notification System Workflow (Process: Notification_Workflows.md)', () => {

  describe('A — Notification Types Coverage', () => {
    it('A01 — 6 appointment notification types', () => expect(APPOINTMENT_TYPES).toHaveLength(6));
    it('A02 — 3 meeting notification types', () => expect(MEETING_TYPES).toHaveLength(3));
    it('A03 — 3 clinical notification types', () => expect(CLINICAL_TYPES).toHaveLength(3));
    it('A04 — 4 system notification types', () => expect(SYSTEM_TYPES).toHaveLength(4));
    it('A05 — 16 total notification types', () => expect(ALL_TYPES).toHaveLength(16));
    it('A06 — no duplicate types', () => {
      const unique = new Set(ALL_TYPES);
      expect(unique.size).toBe(ALL_TYPES.length);
    });
  });

  describe('B — Priority Assignment', () => {
    it('B01 — security alert is urgent', () => expect(getNotificationPriority('security_alert')).toBe('urgent'));
    it('B02 — meeting starting is high', () => expect(getNotificationPriority('meeting_starting')).toBe('high'));
    it('B03 — appointment reminder is high', () => expect(getNotificationPriority('appointment_reminder')).toBe('high'));
    it('B04 — appointment confirmed is medium', () => expect(getNotificationPriority('appointment_confirmed')).toBe('medium'));
    it('B05 — meeting link ready is medium', () => expect(getNotificationPriority('meeting_link_ready')).toBe('medium'));
    it('B06 — EMR available is medium', () => expect(getNotificationPriority('emr_available')).toBe('medium'));
    it('B07 — content approved is low', () => expect(getNotificationPriority('content_approved')).toBe('low'));
    it('B08 — system update is low', () => expect(getNotificationPriority('system_update')).toBe('low'));
  });

  describe('C — Channel Preference Filtering', () => {
    const prefs: NotificationPreferences = {
      userId: 'PAT-001',
      appointments: true, meetings: true, emr: true, system: false, marketing: false,
      channels: { inApp: true, email: true, push: true, sms: false },
    };

    it('C01 — appointment type on enabled channel', () => {
      expect(shouldSendChannel('appointment_confirmed', 'in_app', prefs)).toBe(true);
    });
    it('C02 — meeting type on enabled channel', () => {
      expect(shouldSendChannel('meeting_link_ready', 'email', prefs)).toBe(true);
    });
    it('C03 — system type disabled by preference', () => {
      expect(shouldSendChannel('system_update', 'in_app', prefs)).toBe(false);
    });
    it('C04 — SMS channel disabled', () => {
      expect(shouldSendChannel('appointment_confirmed', 'sms', prefs)).toBe(false);
    });
    it('C05 — clinical type on push channel', () => {
      expect(shouldSendChannel('emr_available', 'push', prefs)).toBe(true);
    });
  });

  describe('D — Read/Unread Management', () => {
    const notifications: Notification[] = [
      { id: '1', userId: 'P1', type: 'appointment_confirmed', title: 'T', titleTh: 'ท', message: 'M', messageTh: 'ข', channels: ['in_app'], read: false, priority: 'medium', createdAt: '2026-01-01' },
      { id: '2', userId: 'P1', type: 'meeting_link_ready', title: 'T', titleTh: 'ท', message: 'M', messageTh: 'ข', channels: ['in_app'], read: true, priority: 'medium', createdAt: '2026-01-02' },
      { id: '3', userId: 'P1', type: 'emr_available', title: 'T', titleTh: 'ท', message: 'M', messageTh: 'ข', channels: ['in_app'], read: false, priority: 'medium', createdAt: '2026-01-03' },
    ];

    it('D01 — count unread', () => expect(getUnreadCount(notifications)).toBe(2));
    it('D02 — mark one as read', () => {
      const updated = markAsRead(notifications[0]);
      expect(updated.read).toBe(true);
      expect(notifications[0].read).toBe(false); // immutable
    });
    it('D03 — mark all as read', () => {
      const all = markAllAsRead(notifications);
      expect(getUnreadCount(all)).toBe(0);
    });
    it('D04 — original unchanged after mark all', () => {
      markAllAsRead(notifications);
      expect(getUnreadCount(notifications)).toBe(2);
    });
  });

  describe('E — Filtering & Sorting', () => {
    const notifications: Notification[] = [
      { id: '1', userId: 'P1', type: 'appointment_confirmed', title: 'T', titleTh: 'ท', message: 'M', messageTh: 'ข', channels: ['in_app'], read: false, priority: 'medium', createdAt: '2026-01-01T10:00:00Z' },
      { id: '2', userId: 'P1', type: 'meeting_starting', title: 'T', titleTh: 'ท', message: 'M', messageTh: 'ข', channels: ['in_app'], read: false, priority: 'high', createdAt: '2026-01-03T10:00:00Z' },
      { id: '3', userId: 'P1', type: 'emr_available', title: 'T', titleTh: 'ท', message: 'M', messageTh: 'ข', channels: ['in_app'], read: false, priority: 'medium', createdAt: '2026-01-02T10:00:00Z' },
    ];

    it('E01 — filter appointment types', () => expect(filterByType(notifications, APPOINTMENT_TYPES)).toHaveLength(1));
    it('E02 — filter meeting types', () => expect(filterByType(notifications, MEETING_TYPES)).toHaveLength(1));
    it('E03 — filter clinical types', () => expect(filterByType(notifications, CLINICAL_TYPES)).toHaveLength(1));
    it('E04 — sort desc by date', () => {
      const sorted = sortByDate(notifications, 'desc');
      expect(sorted[0].id).toBe('2');
      expect(sorted[2].id).toBe('1');
    });
    it('E05 — sort asc by date', () => {
      const sorted = sortByDate(notifications, 'asc');
      expect(sorted[0].id).toBe('1');
    });
  });

  describe('F — Type Categorization', () => {
    it('F01 — appointment types categorized', () => {
      for (const t of APPOINTMENT_TYPES) expect(getTypeCategory(t)).toBe('appointment');
    });
    it('F02 — meeting types categorized', () => {
      for (const t of MEETING_TYPES) expect(getTypeCategory(t)).toBe('meeting');
    });
    it('F03 — clinical types categorized', () => {
      for (const t of CLINICAL_TYPES) expect(getTypeCategory(t)).toBe('clinical');
    });
    it('F04 — system types categorized', () => {
      for (const t of SYSTEM_TYPES) expect(getTypeCategory(t)).toBe('system');
    });
  });

  describe('G — Thai Labels', () => {
    it('G01 — all 16 types have Thai labels', () => {
      for (const t of ALL_TYPES) {
        const label = getThaiTypeLabel(t);
        expect(label).not.toBe(t); // should resolve to Thai, not raw type
      }
    });
    it('G02 — appointment confirmed Thai', () => expect(getThaiTypeLabel('appointment_confirmed')).toBe('ยืนยันนัดหมาย'));
    it('G03 — EMR available Thai', () => expect(getThaiTypeLabel('emr_available')).toBe('เวชระเบียนพร้อม'));
    it('G04 — security alert Thai', () => expect(getThaiTypeLabel('security_alert')).toBe('แจ้งเตือนความปลอดภัย'));
  });

  describe('H — ID Generation', () => {
    it('H01 — starts with NOTIF-', () => expect(generateNotificationId()).toMatch(/^NOTIF-/));
    it('H02 — unique IDs', () => {
      const ids = new Set(Array.from({ length: 20 }, () => generateNotificationId()));
      expect(ids.size).toBe(20);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // I — CONTINUOUS WORKFLOW: Notification Creation → Delivery → Read
  // ═══════════════════════════════════════════════════════════════════════════
  describe('I — Notification Lifecycle Chain', () => {
    const notifications: Notification[] = [];
    const prefs: NotificationPreferences = {
      userId: 'PATIENT-001',
      appointments: true,
      meetings: true,
      emr: true,
      system: true,
      marketing: false,
      channels: { inApp: true, email: true, push: true, sms: false },
    };

    it('I01 — Step 1: Create appointment confirmed notification', () => {
      const notif: Notification = {
        id: generateNotificationId(),
        userId: 'PATIENT-001',
        type: 'appointment_confirmed',
        title: 'Appointment Confirmed',
        titleTh: 'ยืนยันนัดหมาย',
        message: 'Your appointment on June 15 at 09:00 is confirmed.',
        messageTh: 'นัดหมายวันที่ 15 มิ.ย. เวลา 09:00 ได้รับการยืนยัน',
        channels: ['in_app', 'email'],
        read: false,
        priority: 'medium',
        createdAt: '2026-06-14T10:00:00Z',
      };
      notifications.push(notif);
      expect(notifications).toHaveLength(1);
    });

    it('I02 — Step 2: Priority derived from type', () => {
      const priority = getNotificationPriority('appointment_confirmed');
      expect(priority).toBeTruthy();
    });

    it('I03 — Step 3: Should send in-app channel per prefs', () => {
      expect(shouldSendChannel('appointment_confirmed', 'in_app', prefs)).toBe(true);
    });

    it('I04 — Step 4: Should NOT send SMS (disabled)', () => {
      expect(shouldSendChannel('appointment_confirmed', 'sms', prefs)).toBe(false);
    });

    it('I05 — Step 5: Create EMR notification', () => {
      notifications.push({
        id: generateNotificationId(),
        userId: 'PATIENT-001',
        type: 'emr_available',
        title: 'EMR Available',
        titleTh: 'เวชระเบียนพร้อม',
        message: 'Your medical record is ready.',
        messageTh: 'เวชระเบียนของคุณพร้อมแล้ว',
        channels: ['in_app'],
        read: false,
        priority: 'high',
        createdAt: '2026-06-14T11:00:00Z',
      });
      expect(notifications).toHaveLength(2);
    });

    it('I06 — Step 6: Unread count = 2', () => {
      expect(getUnreadCount(notifications)).toBe(2);
    });

    it('I07 — Step 7: Mark first notification as read', () => {
      notifications[0] = markAsRead(notifications[0]);
      expect(notifications[0].read).toBe(true);
    });

    it('I08 — Step 8: Unread count drops to 1', () => {
      expect(getUnreadCount(notifications)).toBe(1);
    });

    it('I09 — Step 9: Filter by appointment types', () => {
      const aptNotifs = filterByType(notifications, APPOINTMENT_TYPES);
      expect(aptNotifs).toHaveLength(1);
    });

    it('I10 — Step 10: Sort by date descending', () => {
      const sorted = sortByDate(notifications, 'desc');
      expect(sorted[0].type).toBe('emr_available');
    });

    it('I11 — Step 11: Mark all as read', () => {
      const allRead = markAllAsRead(notifications);
      expect(getUnreadCount(allRead)).toBe(0);
    });

    it('I12 — Final: Thai labels verified', () => {
      expect(getThaiTypeLabel('appointment_confirmed')).toBe('ยืนยันนัดหมาย');
      expect(getThaiTypeLabel('emr_available')).toBe('เวชระเบียนพร้อม');
    });
  });
});
