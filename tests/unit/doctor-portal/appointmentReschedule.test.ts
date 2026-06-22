/**
 * ═══════════════════════════════════════════════════════════════════════
 * IZARA TELEMEDICINE — APPOINTMENT RESCHEDULE SERVICE UNIT TESTS
 * ═══════════════════════════════════════════════════════════════════════
 * Tests: calculateNextWeekSlot, handleMissedMeeting, sendToPool,
 *        RescheduleRecord structure, MissedMeetingResult actions
 * Source: Isara-doctor-portal/frontend/services/appointmentRescheduleService.ts
 * ═══════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from 'vitest';

// ─── Reimplement pure reschedule logic ──

interface RescheduleRecord {
  appointmentId: string;
  originalDate: string;
  originalTime: string;
  newDate: string;
  newTime: string;
  missedAttempt: number;
  reason: string;
  rescheduledAt: string;
  rescheduledBy: 'system' | 'admin' | 'doctor' | 'patient';
  notificationSent: boolean;
}

interface MissedMeetingResult {
  action: 'rescheduled' | 'sent_to_pool' | 'requires_admin';
  newAppointment?: { date: string; time: string; attemptNumber: number };
  reason: string;
  notificationMessage: string;
}

interface AppointmentForReschedule {
  id: string;
  patientId: string;
  doctorId?: string;
  date: string;
  time: string;
  missedAttempts?: number;
  status: string;
  type?: string;
  symptoms?: string[];
}

interface MeetingTimeRules {
  allowJoinBefore: number;
  allowJoinAfter: number;
  autoRescheduleOnMiss: boolean;
  rescheduleToNextWeek: boolean;
  maxMissedAttempts: number;
}

const DEFAULT_RULES: MeetingTimeRules = {
  allowJoinBefore: 15,
  allowJoinAfter: 30,
  autoRescheduleOnMiss: true,
  rescheduleToNextWeek: true,
  maxMissedAttempts: 3,
};

function calculateNextWeekSlot(currentDate: string, currentTime: string): { date: string; time: string } {
  const date = new Date(currentDate);
  date.setDate(date.getDate() + 7);
  return { date: date.toISOString().split('T')[0], time: currentTime };
}

function determineMissedAction(
  appointment: AppointmentForReschedule,
  rules: MeetingTimeRules
): MissedMeetingResult {
  const missedAttempts = (appointment.missedAttempts || 0) + 1;

  if (missedAttempts >= rules.maxMissedAttempts) {
    return {
      action: 'sent_to_pool',
      reason: `เกินจำนวนครั้งที่พลาด (${missedAttempts} ครั้ง)`,
      notificationMessage: 'การนัดหมายถูกส่งกลับไปยังระบบเพื่อจับคู่แพทย์ใหม่',
    };
  }

  if (rules.autoRescheduleOnMiss && rules.rescheduleToNextWeek) {
    const nextSlot = calculateNextWeekSlot(appointment.date, appointment.time);
    return {
      action: 'rescheduled',
      newAppointment: { date: nextSlot.date, time: nextSlot.time, attemptNumber: missedAttempts + 1 },
      reason: `เลื่อนนัดอัตโนมัติไปสัปดาห์หน้า (ครั้งที่ ${missedAttempts} ที่พลาด)`,
      notificationMessage: `การนัดหมายถูกเลื่อนไปวันที่ ${nextSlot.date} เวลา ${nextSlot.time} น.`,
    };
  }

  return {
    action: 'requires_admin',
    reason: 'การนัดหมายต้องได้รับการอนุมัติจาก Admin ก่อนเลื่อนนัด',
    notificationMessage: 'กรุณาติดต่อ Admin เพื่อจัดการนัดหมายใหม่',
  };
}

function createRescheduleRecord(
  appointmentId: string,
  originalDate: string,
  originalTime: string,
  newDate: string,
  newTime: string,
  missedAttempt: number,
  rescheduledBy: 'system' | 'admin' | 'doctor' | 'patient'
): RescheduleRecord {
  return {
    appointmentId,
    originalDate,
    originalTime,
    newDate,
    newTime,
    missedAttempt,
    reason: rescheduledBy === 'system' ? 'ผู้เข้าร่วมไม่เข้าประชุมภายในเวลาที่กำหนด' : 'Admin จัดเวลานัดใหม่',
    rescheduledAt: new Date().toISOString(),
    rescheduledBy,
    notificationSent: false,
  };
}

function createPoolEntry(appointment: AppointmentForReschedule, missedAttempts: number) {
  return {
    id: `pool_${appointment.id}_${Date.now()}`,
    appointmentId: appointment.id,
    patientId: appointment.patientId,
    originalDoctorId: appointment.doctorId,
    symptoms: appointment.symptoms || [],
    type: appointment.type || 'general',
    priority: 'medium',
    reason: 'max_missed_attempts',
    missedAttempts,
    addedAt: new Date().toISOString(),
    status: 'awaiting_assignment',
    requiresAdminApproval: true,
  };
}

// ════════════════════════════════════════════════════════════════════
// A. CALCULATE NEXT WEEK SLOT (8 tests)
// ════════════════════════════════════════════════════════════════════
describe('Calculate Next Week Slot', () => {
  it('A01 — adds 7 days to a Monday', () => {
    const result = calculateNextWeekSlot('2025-01-13', '10:00'); // Monday
    expect(result.date).toBe('2025-01-20');
  });

  it('A02 — adds 7 days to a Friday', () => {
    const result = calculateNextWeekSlot('2025-01-17', '14:30'); // Friday
    expect(result.date).toBe('2025-01-24');
  });

  it('A03 — keeps time unchanged', () => {
    const result = calculateNextWeekSlot('2025-01-15', '15:45');
    expect(result.time).toBe('15:45');
  });

  it('A04 — crosses month end', () => {
    const result = calculateNextWeekSlot('2025-03-28', '10:00');
    expect(result.date).toBe('2025-04-04');
  });

  it('A05 — crosses year end', () => {
    const result = calculateNextWeekSlot('2024-12-28', '09:00');
    expect(result.date).toBe('2025-01-04');
  });

  it('A06 — handles Feb 28 in non-leap year', () => {
    const result = calculateNextWeekSlot('2025-02-25', '10:00');
    expect(result.date).toBe('2025-03-04');
  });

  it('A07 — handles Feb 29 in leap year', () => {
    const result = calculateNextWeekSlot('2024-02-29', '14:00');
    expect(result.date).toBe('2024-03-07');
  });

  it('A08 — preserves midnight', () => {
    const result = calculateNextWeekSlot('2025-06-01', '00:00');
    expect(result.time).toBe('00:00');
  });
});

// ════════════════════════════════════════════════════════════════════
// B. DETERMINE MISSED ACTION (10 tests)
// ════════════════════════════════════════════════════════════════════
describe('Determine Missed Meeting Action', () => {
  const baseAppointment: AppointmentForReschedule = {
    id: 'apt-001',
    patientId: 'patient-001',
    doctorId: 'doctor-001',
    date: '2025-01-15',
    time: '14:00',
    missedAttempts: 0,
    status: 'confirmed',
    type: 'video',
    symptoms: ['headache'],
  };

  it('B01 — first miss auto-reschedules', () => {
    const result = determineMissedAction(baseAppointment, DEFAULT_RULES);
    expect(result.action).toBe('rescheduled');
  });

  it('B02 — first miss provides next week date', () => {
    const result = determineMissedAction(baseAppointment, DEFAULT_RULES);
    expect(result.newAppointment?.date).toBe('2025-01-22');
    expect(result.newAppointment?.time).toBe('14:00');
  });

  it('B03 — first miss attempt number is 2', () => {
    const result = determineMissedAction(baseAppointment, DEFAULT_RULES);
    expect(result.newAppointment?.attemptNumber).toBe(2);
  });

  it('B04 — second miss still reschedules', () => {
    const apt = { ...baseAppointment, missedAttempts: 1 };
    const result = determineMissedAction(apt, DEFAULT_RULES);
    expect(result.action).toBe('rescheduled');
  });

  it('B05 — third miss sends to pool', () => {
    const apt = { ...baseAppointment, missedAttempts: 2 };
    const result = determineMissedAction(apt, DEFAULT_RULES);
    expect(result.action).toBe('sent_to_pool');
  });

  it('B06 — pool notification is informative', () => {
    const apt = { ...baseAppointment, missedAttempts: 2 };
    const result = determineMissedAction(apt, DEFAULT_RULES);
    expect(result.notificationMessage).toContain('จับคู่แพทย์ใหม่');
  });

  it('B07 — auto-reschedule off requires admin', () => {
    const rules = { ...DEFAULT_RULES, autoRescheduleOnMiss: false };
    const result = determineMissedAction(baseAppointment, rules);
    expect(result.action).toBe('requires_admin');
  });

  it('B08 — rescheduleToNextWeek off requires admin', () => {
    const rules = { ...DEFAULT_RULES, rescheduleToNextWeek: false };
    const result = determineMissedAction(baseAppointment, rules);
    expect(result.action).toBe('requires_admin');
  });

  it('B09 — max attempts 1 immediately pools', () => {
    const rules = { ...DEFAULT_RULES, maxMissedAttempts: 1 };
    const result = determineMissedAction(baseAppointment, rules);
    expect(result.action).toBe('sent_to_pool');
  });

  it('B10 — undefined missedAttempts treated as 0', () => {
    const apt = { ...baseAppointment, missedAttempts: undefined };
    const result = determineMissedAction(apt, DEFAULT_RULES);
    expect(result.action).toBe('rescheduled');
  });
});

// ════════════════════════════════════════════════════════════════════
// C. RESCHEDULE RECORD CREATION (8 tests)
// ════════════════════════════════════════════════════════════════════
describe('Reschedule Record Creation', () => {
  it('C01 — system reschedule has correct reason', () => {
    const record = createRescheduleRecord('apt-1', '2025-01-15', '14:00', '2025-01-22', '14:00', 1, 'system');
    expect(record.reason).toContain('ไม่เข้าประชุม');
    expect(record.rescheduledBy).toBe('system');
  });

  it('C02 — admin reschedule has admin reason', () => {
    const record = createRescheduleRecord('apt-1', '2025-01-15', '14:00', '2025-01-25', '16:00', 2, 'admin');
    expect(record.reason).toContain('Admin');
    expect(record.rescheduledBy).toBe('admin');
  });

  it('C03 — notificationSent defaults to false', () => {
    const record = createRescheduleRecord('apt-1', '2025-01-15', '14:00', '2025-01-22', '14:00', 1, 'system');
    expect(record.notificationSent).toBe(false);
  });

  it('C04 — preserves original date and time', () => {
    const record = createRescheduleRecord('apt-1', '2025-03-10', '09:30', '2025-03-17', '09:30', 1, 'system');
    expect(record.originalDate).toBe('2025-03-10');
    expect(record.originalTime).toBe('09:30');
  });

  it('C05 — stores new date and time', () => {
    const record = createRescheduleRecord('apt-1', '2025-03-10', '09:30', '2025-03-17', '09:30', 1, 'system');
    expect(record.newDate).toBe('2025-03-17');
    expect(record.newTime).toBe('09:30');
  });

  it('C06 — missedAttempt count is stored', () => {
    const record = createRescheduleRecord('apt-1', '2025-01-15', '14:00', '2025-01-22', '14:00', 3, 'system');
    expect(record.missedAttempt).toBe(3);
  });

  it('C07 — rescheduledAt is a valid ISO timestamp', () => {
    const record = createRescheduleRecord('apt-1', '2025-01-15', '14:00', '2025-01-22', '14:00', 1, 'system');
    expect(new Date(record.rescheduledAt).toISOString()).toBe(record.rescheduledAt);
  });

  it('C08 — appointmentId is preserved', () => {
    const record = createRescheduleRecord('apt-xyz-123', '2025-01-15', '14:00', '2025-01-22', '14:00', 1, 'doctor');
    expect(record.appointmentId).toBe('apt-xyz-123');
  });
});

// ════════════════════════════════════════════════════════════════════
// D. POOL ENTRY CREATION (8 tests)
// ════════════════════════════════════════════════════════════════════
describe('Pool Entry Creation', () => {
  const baseAppointment: AppointmentForReschedule = {
    id: 'apt-001',
    patientId: 'patient-001',
    doctorId: 'doctor-001',
    date: '2025-01-15',
    time: '14:00',
    missedAttempts: 2,
    status: 'confirmed',
    type: 'video',
    symptoms: ['fever', 'cough'],
  };

  it('D01 — pool entry ID contains appointment ID', () => {
    const entry = createPoolEntry(baseAppointment, 3);
    expect(entry.id).toContain('pool_apt-001_');
  });

  it('D02 — preserves patient ID', () => {
    const entry = createPoolEntry(baseAppointment, 3);
    expect(entry.patientId).toBe('patient-001');
  });

  it('D03 — stores original doctor ID', () => {
    const entry = createPoolEntry(baseAppointment, 3);
    expect(entry.originalDoctorId).toBe('doctor-001');
  });

  it('D04 — preserves symptoms', () => {
    const entry = createPoolEntry(baseAppointment, 3);
    expect(entry.symptoms).toEqual(['fever', 'cough']);
  });

  it('D05 — defaults empty symptoms to empty array', () => {
    const apt = { ...baseAppointment, symptoms: undefined };
    const entry = createPoolEntry(apt, 3);
    expect(entry.symptoms).toEqual([]);
  });

  it('D06 — defaults type to general', () => {
    const apt = { ...baseAppointment, type: undefined };
    const entry = createPoolEntry(apt, 3);
    expect(entry.type).toBe('general');
  });

  it('D07 — requires admin approval', () => {
    const entry = createPoolEntry(baseAppointment, 3);
    expect(entry.requiresAdminApproval).toBe(true);
  });

  it('D08 — status is awaiting_assignment', () => {
    const entry = createPoolEntry(baseAppointment, 3);
    expect(entry.status).toBe('awaiting_assignment');
  });
});

// ════════════════════════════════════════════════════════════════════
// E. EDGE CASES (6 tests)
// ════════════════════════════════════════════════════════════════════
describe('Reschedule Edge Cases', () => {
  const baseAppointment: AppointmentForReschedule = {
    id: 'apt-edge',
    patientId: 'p1',
    date: '2025-01-15',
    time: '14:00',
    status: 'confirmed',
  };

  it('E01 — no doctor ID still reschedules', () => {
    const result = determineMissedAction(baseAppointment, DEFAULT_RULES);
    expect(result.action).toBe('rescheduled');
  });

  it('E02 — pool entry handles missing doctor ID', () => {
    const entry = createPoolEntry(baseAppointment, 3);
    expect(entry.originalDoctorId).toBeUndefined();
  });

  it('E03 — multiple reschedules chain correctly', () => {
    let date = '2025-01-15';
    for (let i = 0; i < 3; i++) {
      const slot = calculateNextWeekSlot(date, '14:00');
      date = slot.date;
    }
    expect(date).toBe('2025-02-05'); // 3 weeks later
  });

  it('E04 — notification message always non-empty', () => {
    const actions = [
      determineMissedAction(baseAppointment, DEFAULT_RULES),
      determineMissedAction({ ...baseAppointment, missedAttempts: 2 }, DEFAULT_RULES),
      determineMissedAction(baseAppointment, { ...DEFAULT_RULES, autoRescheduleOnMiss: false }),
    ];
    actions.forEach(a => expect(a.notificationMessage.length).toBeGreaterThan(0));
  });

  it('E05 — reason always non-empty', () => {
    const actions = [
      determineMissedAction(baseAppointment, DEFAULT_RULES),
      determineMissedAction({ ...baseAppointment, missedAttempts: 2 }, DEFAULT_RULES),
    ];
    actions.forEach(a => expect(a.reason.length).toBeGreaterThan(0));
  });

  it('E06 — rescheduled action always has newAppointment', () => {
    const result = determineMissedAction(baseAppointment, DEFAULT_RULES);
    expect(result.action).toBe('rescheduled');
    expect(result.newAppointment).toBeDefined();
    expect(result.newAppointment!.date).toBeTruthy();
    expect(result.newAppointment!.time).toBeTruthy();
  });
});
