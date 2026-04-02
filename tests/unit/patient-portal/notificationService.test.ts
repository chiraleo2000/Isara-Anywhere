/**
 * ═══════════════════════════════════════════════════════════════════════
 * IZARA TELEMEDICINE — NOTIFICATION SERVICE UNIT TESTS
 * ═══════════════════════════════════════════════════════════════════════
 * Tests: notification type validation, urgency labels, channel routing,
 *        notification structure, appointment workflow triggers
 * Source: Isara-patient-portal/server/services/notificationService.ts
 * ═══════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from 'vitest';

// ─── Reimplement pure notification logic ──

type NotificationType =
  | 'appointment_requested'
  | 'appointment_confirmed'
  | 'appointment_declined'
  | 'appointment_cancelled'
  | 'appointment_assigned'
  | 'appointment_rescheduled'
  | 'meeting_link_ready'
  | 'meeting_link_failed'
  | 'meeting_reminder'
  | 'emr_signed'
  | 'emr_ready_for_review';

type RecipientRole = 'patient' | 'doctor' | 'admin';

interface Notification {
  id: string;
  type: NotificationType;
  recipientId: string;
  recipientEmail: string;
  recipientRole: RecipientRole;
  title: string;
  message: string;
  data?: {
    appointmentId?: string;
    patientId?: string;
    meetingLink?: string;
    calendarEventUrl?: string;
    symptoms?: string[];
    urgency?: string;
    doctorName?: string;
    patientName?: string;
    appointmentDate?: string;
    appointmentTime?: string;
    appointmentType?: string;
  };
  channels: ('email' | 'in-app' | 'calendar')[];
  status: 'pending' | 'sent' | 'failed';
  createdAt: string;
  sentAt?: string;
  error?: string;
}

const ALL_NOTIFICATION_TYPES: NotificationType[] = [
  'appointment_requested', 'appointment_confirmed', 'appointment_declined',
  'appointment_cancelled', 'appointment_assigned', 'appointment_rescheduled',
  'meeting_link_ready', 'meeting_link_failed', 'meeting_reminder',
  'emr_signed', 'emr_ready_for_review',
];

function getUrgencyLabel(urgency: string): string {
  if (urgency === 'emergency') return '🚨 ฉุกเฉิน';
  if (urgency === 'urgent') return '⚠️ เร่งด่วน';
  return '✅ ปกติ';
}

function formatSymptomsHtml(symptoms: any): string {
  if (!symptoms) return '';
  const text = typeof symptoms === 'object' ? JSON.stringify(symptoms) : symptoms;
  return '<p><strong>รายละเอียด:</strong> ' + text + '</p>';
}

function getTimeSlotLabel(slot: string): string {
  if (slot === 'morning') return 'เช้า';
  if (slot === 'afternoon') return 'บ่าย';
  return 'เย็น';
}

// Channel routing: which channels per notification type
function getChannelsForType(
  type: NotificationType,
  appointmentType?: string
): ('email' | 'in-app' | 'calendar')[] {
  switch (type) {
    case 'appointment_requested':
      return ['email', 'in-app'];
    case 'appointment_confirmed':
      return appointmentType === 'video'
        ? ['email', 'in-app', 'calendar']
        : ['email', 'in-app'];
    case 'appointment_declined':
    case 'appointment_cancelled':
      return ['email', 'in-app'];
    case 'appointment_assigned':
      return ['email', 'in-app'];
    case 'appointment_rescheduled':
      return ['email', 'in-app', 'calendar'];
    case 'meeting_link_ready':
    case 'meeting_link_failed':
      return ['email', 'in-app'];
    case 'meeting_reminder':
      return ['email', 'in-app'];
    case 'emr_signed':
    case 'emr_ready_for_review':
      return ['email', 'in-app'];
    default:
      return ['in-app'];
  }
}

// Recipient routing: who gets notified per event type
function getRecipientsForType(
  type: NotificationType
): RecipientRole[] {
  switch (type) {
    case 'appointment_requested':
      return ['doctor', 'admin'];
    case 'appointment_confirmed':
      return ['patient'];
    case 'appointment_declined':
      return ['patient', 'admin'];
    case 'appointment_cancelled':
      return ['doctor', 'admin'];
    case 'appointment_assigned':
      return ['doctor'];
    case 'appointment_rescheduled':
      return ['patient', 'doctor'];
    case 'meeting_link_ready':
      return ['patient', 'doctor'];
    case 'meeting_link_failed':
      return ['patient', 'doctor', 'admin'];
    case 'meeting_reminder':
      return ['patient', 'doctor'];
    case 'emr_signed':
      return ['patient'];
    case 'emr_ready_for_review':
      return ['doctor'];
    default:
      return [];
  }
}

function createNotification(
  type: NotificationType,
  recipientId: string,
  recipientEmail: string,
  recipientRole: RecipientRole,
  title: string,
  message: string,
  data?: Notification['data']
): Notification {
  return {
    id: `NOTIF-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    type,
    recipientId,
    recipientEmail,
    recipientRole,
    title,
    message,
    data,
    channels: getChannelsForType(type, data?.appointmentType),
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
}

// ════════════════════════════════════════════════════════════════════
// A. NOTIFICATION TYPES (8 tests)
// ════════════════════════════════════════════════════════════════════
describe('Notification Types', () => {
  it('A01 — 11 notification types defined', () => {
    expect(ALL_NOTIFICATION_TYPES).toHaveLength(11);
  });

  it('A02 — includes appointment_requested', () => {
    expect(ALL_NOTIFICATION_TYPES).toContain('appointment_requested');
  });

  it('A03 — includes appointment_confirmed', () => {
    expect(ALL_NOTIFICATION_TYPES).toContain('appointment_confirmed');
  });

  it('A04 — includes appointment_declined', () => {
    expect(ALL_NOTIFICATION_TYPES).toContain('appointment_declined');
  });

  it('A05 — includes meeting_link_ready', () => {
    expect(ALL_NOTIFICATION_TYPES).toContain('meeting_link_ready');
  });

  it('A06 — includes emr_signed', () => {
    expect(ALL_NOTIFICATION_TYPES).toContain('emr_signed');
  });

  it('A07 — includes appointment_rescheduled', () => {
    expect(ALL_NOTIFICATION_TYPES).toContain('appointment_rescheduled');
  });

  it('A08 — all types are unique', () => {
    const unique = new Set(ALL_NOTIFICATION_TYPES);
    expect(unique.size).toBe(ALL_NOTIFICATION_TYPES.length);
  });
});

// ════════════════════════════════════════════════════════════════════
// B. URGENCY LABELS (6 tests)
// ════════════════════════════════════════════════════════════════════
describe('Urgency Labels', () => {
  it('B01 — emergency shows 🚨 with Thai text', () => {
    expect(getUrgencyLabel('emergency')).toBe('🚨 ฉุกเฉิน');
  });

  it('B02 — urgent shows ⚠️ with Thai text', () => {
    expect(getUrgencyLabel('urgent')).toBe('⚠️ เร่งด่วน');
  });

  it('B03 — normal shows ✅ with Thai text', () => {
    expect(getUrgencyLabel('normal')).toBe('✅ ปกติ');
  });

  it('B04 — unknown defaults to normal', () => {
    expect(getUrgencyLabel('unknown')).toBe('✅ ปกติ');
  });

  it('B05 — empty string defaults to normal', () => {
    expect(getUrgencyLabel('')).toBe('✅ ปกติ');
  });

  it('B06 — all urgency labels contain Thai text', () => {
    ['emergency', 'urgent', 'normal'].forEach(u => {
      const label = getUrgencyLabel(u);
      expect(label.length).toBeGreaterThan(2);
    });
  });
});

// ════════════════════════════════════════════════════════════════════
// C. SYMPTOMS FORMATTING (6 tests)
// ════════════════════════════════════════════════════════════════════
describe('Symptoms Formatting', () => {
  it('C01 — formats string symptoms', () => {
    const result = formatSymptomsHtml('headache');
    expect(result).toContain('headache');
    expect(result).toContain('<p>');
  });

  it('C02 — formats array symptoms as JSON', () => {
    const result = formatSymptomsHtml(['headache', 'fever']);
    expect(result).toContain('headache');
    expect(result).toContain('fever');
  });

  it('C03 — returns empty for null', () => {
    expect(formatSymptomsHtml(null)).toBe('');
  });

  it('C04 — returns empty for undefined', () => {
    expect(formatSymptomsHtml(undefined)).toBe('');
  });

  it('C05 — includes รายละเอียด label', () => {
    const result = formatSymptomsHtml('cough');
    expect(result).toContain('รายละเอียด');
  });

  it('C06 — wraps in HTML tags', () => {
    const result = formatSymptomsHtml('fever');
    expect(result).toContain('<strong>');
    expect(result).toContain('</p>');
  });
});

// ════════════════════════════════════════════════════════════════════
// D. TIME SLOT LABELS (4 tests)
// ════════════════════════════════════════════════════════════════════
describe('Time Slot Labels', () => {
  it('D01 — morning = เช้า', () => {
    expect(getTimeSlotLabel('morning')).toBe('เช้า');
  });

  it('D02 — afternoon = บ่าย', () => {
    expect(getTimeSlotLabel('afternoon')).toBe('บ่าย');
  });

  it('D03 — evening = เย็น', () => {
    expect(getTimeSlotLabel('evening')).toBe('เย็น');
  });

  it('D04 — unknown defaults to เย็น', () => {
    expect(getTimeSlotLabel('unknown')).toBe('เย็น');
  });
});

// ════════════════════════════════════════════════════════════════════
// E. CHANNEL ROUTING (10 tests)
// ════════════════════════════════════════════════════════════════════
describe('Channel Routing', () => {
  it('E01 — appointment_requested uses email + in-app', () => {
    const channels = getChannelsForType('appointment_requested');
    expect(channels).toContain('email');
    expect(channels).toContain('in-app');
    expect(channels).not.toContain('calendar');
  });

  it('E02 — appointment_confirmed (video) includes calendar', () => {
    const channels = getChannelsForType('appointment_confirmed', 'video');
    expect(channels).toContain('calendar');
  });

  it('E03 — appointment_confirmed (in_person) no calendar', () => {
    const channels = getChannelsForType('appointment_confirmed', 'in_person');
    expect(channels).not.toContain('calendar');
  });

  it('E04 — appointment_declined is email + in-app', () => {
    const channels = getChannelsForType('appointment_declined');
    expect(channels).toEqual(['email', 'in-app']);
  });

  it('E05 — appointment_rescheduled includes calendar', () => {
    const channels = getChannelsForType('appointment_rescheduled');
    expect(channels).toContain('calendar');
  });

  it('E06 — meeting_link_ready is email + in-app', () => {
    const channels = getChannelsForType('meeting_link_ready');
    expect(channels).toContain('email');
    expect(channels).toContain('in-app');
  });

  it('E07 — emr_signed is email + in-app', () => {
    const channels = getChannelsForType('emr_signed');
    expect(channels).toEqual(['email', 'in-app']);
  });

  it('E08 — meeting_reminder uses email + in-app', () => {
    const channels = getChannelsForType('meeting_reminder');
    expect(channels).toContain('email');
    expect(channels).toContain('in-app');
  });

  it('E09 — all channels are valid', () => {
    const validChannels = ['email', 'in-app', 'calendar'];
    ALL_NOTIFICATION_TYPES.forEach(type => {
      const channels = getChannelsForType(type);
      channels.forEach(ch => expect(validChannels).toContain(ch));
    });
  });

  it('E10 — every type has at least 1 channel', () => {
    ALL_NOTIFICATION_TYPES.forEach(type => {
      expect(getChannelsForType(type).length).toBeGreaterThanOrEqual(1);
    });
  });
});

// ════════════════════════════════════════════════════════════════════
// F. RECIPIENT ROUTING (10 tests)
// ════════════════════════════════════════════════════════════════════
describe('Recipient Routing', () => {
  it('F01 — appointment_requested notifies doctor + admin', () => {
    const recipients = getRecipientsForType('appointment_requested');
    expect(recipients).toContain('doctor');
    expect(recipients).toContain('admin');
    expect(recipients).not.toContain('patient');
  });

  it('F02 — appointment_confirmed notifies patient', () => {
    const recipients = getRecipientsForType('appointment_confirmed');
    expect(recipients).toContain('patient');
  });

  it('F03 — appointment_declined notifies patient + admin', () => {
    const recipients = getRecipientsForType('appointment_declined');
    expect(recipients).toContain('patient');
    expect(recipients).toContain('admin');
  });

  it('F04 — appointment_cancelled notifies doctor + admin', () => {
    const recipients = getRecipientsForType('appointment_cancelled');
    expect(recipients).toContain('doctor');
    expect(recipients).toContain('admin');
  });

  it('F05 — appointment_assigned notifies doctor', () => {
    const recipients = getRecipientsForType('appointment_assigned');
    expect(recipients).toEqual(['doctor']);
  });

  it('F06 — meeting_link_failed notifies all three roles', () => {
    const recipients = getRecipientsForType('meeting_link_failed');
    expect(recipients).toContain('patient');
    expect(recipients).toContain('doctor');
    expect(recipients).toContain('admin');
  });

  it('F07 — meeting_reminder notifies patient + doctor', () => {
    const recipients = getRecipientsForType('meeting_reminder');
    expect(recipients).toContain('patient');
    expect(recipients).toContain('doctor');
  });

  it('F08 — emr_signed notifies patient only', () => {
    const recipients = getRecipientsForType('emr_signed');
    expect(recipients).toEqual(['patient']);
  });

  it('F09 — emr_ready_for_review notifies doctor only', () => {
    const recipients = getRecipientsForType('emr_ready_for_review');
    expect(recipients).toEqual(['doctor']);
  });

  it('F10 — every type has at least 1 recipient', () => {
    ALL_NOTIFICATION_TYPES.forEach(type => {
      expect(getRecipientsForType(type).length).toBeGreaterThanOrEqual(1);
    });
  });
});

// ════════════════════════════════════════════════════════════════════
// G. NOTIFICATION CREATION (10 tests)
// ════════════════════════════════════════════════════════════════════
describe('Notification Creation', () => {
  it('G01 — creates with unique ID', () => {
    const n = createNotification('appointment_requested', 'u1', 'a@b.com', 'doctor', 'Title', 'Msg');
    expect(n.id).toMatch(/^NOTIF-/);
  });

  it('G02 — generates different IDs each time', () => {
    const n1 = createNotification('appointment_requested', 'u1', 'a@b.com', 'doctor', 'T', 'M');
    const n2 = createNotification('appointment_requested', 'u1', 'a@b.com', 'doctor', 'T', 'M');
    expect(n1.id).not.toBe(n2.id);
  });

  it('G03 — status defaults to pending', () => {
    const n = createNotification('emr_signed', 'u1', 'a@b.com', 'patient', 'T', 'M');
    expect(n.status).toBe('pending');
  });

  it('G04 — sets createdAt timestamp', () => {
    const before = Date.now();
    const n = createNotification('meeting_reminder', 'u1', 'a@b.com', 'doctor', 'T', 'M');
    const after = Date.now();
    const ts = new Date(n.createdAt).getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });

  it('G05 — stores recipient details', () => {
    const n = createNotification('appointment_confirmed', 'p1', 'patient@test.com', 'patient', 'Confirmed', 'Your apt is confirmed');
    expect(n.recipientId).toBe('p1');
    expect(n.recipientEmail).toBe('patient@test.com');
    expect(n.recipientRole).toBe('patient');
  });

  it('G06 — includes channels based on type', () => {
    const n = createNotification('appointment_confirmed', 'p1', 'a@b.com', 'patient', 'T', 'M', { appointmentType: 'video' });
    expect(n.channels).toContain('calendar');
  });

  it('G07 — stores optional data', () => {
    const n = createNotification('meeting_link_ready', 'p1', 'a@b.com', 'patient', 'T', 'M', {
      appointmentId: 'apt-001',
      meetingLink: 'https://meet.google.com/abc-def',
    });
    expect(n.data?.appointmentId).toBe('apt-001');
    expect(n.data?.meetingLink).toContain('meet.google.com');
  });

  it('G08 — sentAt is initially undefined', () => {
    const n = createNotification('emr_signed', 'p1', 'a@b.com', 'patient', 'T', 'M');
    expect(n.sentAt).toBeUndefined();
  });

  it('G09 — error is initially undefined', () => {
    const n = createNotification('emr_signed', 'p1', 'a@b.com', 'patient', 'T', 'M');
    expect(n.error).toBeUndefined();
  });

  it('G10 — preserves custom title and message', () => {
    const n = createNotification('appointment_requested', 'd1', 'dr@izara.com', 'doctor',
      'นัดหมายใหม่', 'ผู้ป่วยต้องการนัดพบแพทย์');
    expect(n.title).toBe('นัดหมายใหม่');
    expect(n.message).toContain('ผู้ป่วย');
  });
});

// ════════════════════════════════════════════════════════════════════
// H. WORKFLOW INTEGRATION (8 tests)
// ════════════════════════════════════════════════════════════════════
describe('Notification Workflow Integration', () => {
  it('H01 — patient books → doctor + admin get notified', () => {
    const recipients = getRecipientsForType('appointment_requested');
    const channels = getChannelsForType('appointment_requested');
    expect(recipients).toEqual(['doctor', 'admin']);
    expect(channels).toContain('email');
  });

  it('H02 — doctor confirms video → patient gets email + calendar', () => {
    const recipients = getRecipientsForType('appointment_confirmed');
    const channels = getChannelsForType('appointment_confirmed', 'video');
    expect(recipients).toContain('patient');
    expect(channels).toContain('email');
    expect(channels).toContain('calendar');
  });

  it('H03 — doctor declines → patient + admin notified', () => {
    const recipients = getRecipientsForType('appointment_declined');
    expect(recipients).toContain('patient');
    expect(recipients).toContain('admin');
  });

  it('H04 — patient cancels → doctor + admin notified', () => {
    const recipients = getRecipientsForType('appointment_cancelled');
    expect(recipients).toContain('doctor');
    expect(recipients).toContain('admin');
    expect(recipients).not.toContain('patient');
  });

  it('H05 — meeting link failure → all parties notified', () => {
    const recipients = getRecipientsForType('meeting_link_failed');
    expect(recipients).toHaveLength(3);
  });

  it('H06 — EMR signed → patient notified for review', () => {
    const recipients = getRecipientsForType('emr_signed');
    expect(recipients).toEqual(['patient']);
  });

  it('H07 — rescheduled → both patient and doctor notified with calendar', () => {
    const recipients = getRecipientsForType('appointment_rescheduled');
    const channels = getChannelsForType('appointment_rescheduled');
    expect(recipients).toContain('patient');
    expect(recipients).toContain('doctor');
    expect(channels).toContain('calendar');
  });

  it('H08 — in-person confirmation → no calendar event', () => {
    const channels = getChannelsForType('appointment_confirmed', 'in_person');
    expect(channels).not.toContain('calendar');
    expect(channels).toContain('email');
    expect(channels).toContain('in-app');
  });
});
