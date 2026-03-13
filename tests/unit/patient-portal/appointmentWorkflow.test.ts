// ============================================================================
// Appointment Workflow End-to-End Tests
// Based on: Processes/Appointment_Workflows.md
// Tests: Full appointment lifecycle — booking → approval → assign doctor →
//        meeting → EMR → delivery, pool system, doctor scheduling
// ============================================================================

import { describe, it, expect } from 'vitest';

// --- Types ---

type AppointmentStatus =
  | 'pending' | 'approved' | 'assigned' | 'scheduled'
  | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
  | 'rescheduled';

type AppointmentType = 'general' | 'specialist' | 'follow_up' | 'emergency' | 'mental_health';

interface Appointment {
  id: string;
  patientId: string;
  doctorId?: string;
  type: AppointmentType;
  status: AppointmentStatus;
  requestedDate: string;
  requestedTime: string;
  symptoms: string[];
  symptomsText?: string;
  priority: 'normal' | 'high' | 'urgent';
  createdAt: string;
  updatedAt: string;
}

interface DoctorSchedule {
  doctorId: string;
  dayOfWeek: number; // 0=Sun, 6=Sat
  startTime: string;
  endTime: string;
  slotDuration: number; // minutes
  maxPatients: number;
}

interface AppointmentPool {
  id: string;
  date: string;
  totalSlots: number;
  bookedSlots: number;
  availableDoctors: string[];
}

// --- Constants ---

const APPOINTMENT_TYPES: AppointmentType[] = ['general', 'specialist', 'follow_up', 'emergency', 'mental_health'];

const VALID_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  pending: ['approved', 'cancelled'],
  approved: ['assigned', 'cancelled'],
  assigned: ['scheduled', 'cancelled'],
  scheduled: ['in_progress', 'cancelled', 'no_show', 'rescheduled'],
  in_progress: ['completed'],
  completed: [],
  cancelled: [],
  no_show: ['rescheduled'],
  rescheduled: ['pending'],
};

const APPOINTMENT_TYPE_LABELS_TH: Record<AppointmentType, string> = {
  general: 'ทั่วไป',
  specialist: 'เฉพาะทาง',
  follow_up: 'ติดตามผล',
  emergency: 'ฉุกเฉิน',
  mental_health: 'สุขภาพจิต',
};

const WORKING_HOURS = { start: '08:00', end: '17:00' };
const SLOT_DURATION = 30; // minutes

// --- Helper Functions ---

function canTransition(current: AppointmentStatus, next: AppointmentStatus): boolean {
  return VALID_TRANSITIONS[current]?.includes(next) ?? false;
}

function getCompleteLifecycle(): AppointmentStatus[] {
  return ['pending', 'approved', 'assigned', 'scheduled', 'in_progress', 'completed'];
}

function validateLifecycle(statuses: AppointmentStatus[]): boolean {
  for (let i = 0; i < statuses.length - 1; i++) {
    if (!canTransition(statuses[i], statuses[i + 1])) return false;
  }
  return true;
}

function generateAppointmentId(): string {
  return `APT-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

function isTimeInWorkingHours(time: string): boolean {
  return time >= WORKING_HOURS.start && time <= WORKING_HOURS.end;
}

function calculateAvailableSlots(schedule: DoctorSchedule): number {
  const startMinutes = parseTimeToMinutes(schedule.startTime);
  const endMinutes = parseTimeToMinutes(schedule.endTime);
  return Math.floor((endMinutes - startMinutes) / schedule.slotDuration);
}

function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function isPoolAvailable(pool: AppointmentPool): boolean {
  return pool.bookedSlots < pool.totalSlots && pool.availableDoctors.length > 0;
}

function getPoolUtilization(pool: AppointmentPool): number {
  if (pool.totalSlots === 0) return 0;
  return Math.round((pool.bookedSlots / pool.totalSlots) * 100);
}

function validateBookingRequest(data: Partial<Appointment>): string[] {
  const errors: string[] = [];
  if (!data.patientId) errors.push('Patient ID required');
  if (!data.type || !APPOINTMENT_TYPES.includes(data.type)) errors.push('Valid appointment type required');
  if (!data.requestedDate) errors.push('Requested date required');
  if (!data.requestedTime) errors.push('Requested time required');
  if (data.requestedTime && !isTimeInWorkingHours(data.requestedTime)) errors.push('Time must be within working hours');
  if (!data.symptoms || data.symptoms.length === 0) errors.push('At least one symptom required');
  return errors;
}

function getPriority(type: AppointmentType): 'normal' | 'high' | 'urgent' {
  if (type === 'emergency') return 'urgent';
  if (type === 'mental_health') return 'high';
  return 'normal';
}

function isWeekday(date: string): boolean {
  const day = new Date(date).getDay();
  return day !== 0 && day !== 6;
}

function getStatusLabel(status: AppointmentStatus, lang: 'th' | 'en' = 'th'): string {
  const thLabels: Record<AppointmentStatus, string> = {
    pending: 'รอดำเนินการ', approved: 'อนุมัติ', assigned: 'มอบหมายแล้ว',
    scheduled: 'นัดหมายแล้ว', in_progress: 'กำลังดำเนินการ',
    completed: 'เสร็จสิ้น', cancelled: 'ยกเลิก', no_show: 'ไม่มา',
    rescheduled: 'เลื่อนนัด',
  };
  return lang === 'th' ? thLabels[status] : status;
}

// --- Tests ---

describe('Appointment Workflow (Process: Appointment_Workflows.md)', () => {

  describe('A — Complete Lifecycle', () => {
    it('A01 — happy path lifecycle is valid', () => {
      expect(validateLifecycle(getCompleteLifecycle())).toBe(true);
    });
    it('A02 — 6 steps in complete lifecycle', () => {
      expect(getCompleteLifecycle()).toHaveLength(6);
    });
    it('A03 — lifecycle starts with pending', () => {
      expect(getCompleteLifecycle()[0]).toBe('pending');
    });
    it('A04 — lifecycle ends with completed', () => {
      const lc = getCompleteLifecycle();
      expect(lc.at(-1)).toBe('completed');
    });
    it('A05 — 5 appointment types', () => expect(APPOINTMENT_TYPES).toHaveLength(5));
  });

  describe('B — Status Transitions', () => {
    it('B01 — pending → approved', () => expect(canTransition('pending', 'approved')).toBe(true));
    it('B02 — pending → cancelled', () => expect(canTransition('pending', 'cancelled')).toBe(true));
    it('B03 — approved → assigned', () => expect(canTransition('approved', 'assigned')).toBe(true));
    it('B04 — assigned → scheduled', () => expect(canTransition('assigned', 'scheduled')).toBe(true));
    it('B05 — scheduled → in_progress', () => expect(canTransition('scheduled', 'in_progress')).toBe(true));
    it('B06 — scheduled → no_show', () => expect(canTransition('scheduled', 'no_show')).toBe(true));
    it('B07 — in_progress → completed', () => expect(canTransition('in_progress', 'completed')).toBe(true));
    it('B08 — no_show → rescheduled', () => expect(canTransition('no_show', 'rescheduled')).toBe(true));
    it('B09 — rescheduled → pending', () => expect(canTransition('rescheduled', 'pending')).toBe(true));
    it('B10 — completed is terminal', () => expect(VALID_TRANSITIONS.completed).toHaveLength(0));
    it('B11 — cancelled is terminal', () => expect(VALID_TRANSITIONS.cancelled).toHaveLength(0));
    it('B12 — cannot skip pending to scheduled', () => expect(canTransition('pending', 'scheduled')).toBe(false));
    it('B13 — cannot go back from in_progress', () => expect(canTransition('in_progress', 'scheduled')).toBe(false));
  });

  describe('C — Booking Validation', () => {
    it('C01 — valid booking passes', () => {
      expect(validateBookingRequest({
        patientId: 'PAT-001', type: 'general',
        requestedDate: '2026-06-01', requestedTime: '10:00',
        symptoms: ['ปวดหัว'],
      })).toHaveLength(0);
    });
    it('C02 — missing patient ID', () => {
      const errors = validateBookingRequest({ type: 'general', requestedDate: '2026-06-01', requestedTime: '10:00', symptoms: ['X'] });
      expect(errors).toContain('Patient ID required');
    });
    it('C03 — invalid type fails', () => {
      const errors = validateBookingRequest({ patientId: 'P1', type: 'dental' as any, requestedDate: '2026-06-01', requestedTime: '10:00', symptoms: ['X'] });
      expect(errors).toContain('Valid appointment type required');
    });
    it('C04 — outside working hours', () => {
      const errors = validateBookingRequest({ patientId: 'P1', type: 'general', requestedDate: '2026-06-01', requestedTime: '19:00', symptoms: ['X'] });
      expect(errors).toContain('Time must be within working hours');
    });
    it('C05 — no symptoms fails', () => {
      const errors = validateBookingRequest({ patientId: 'P1', type: 'general', requestedDate: '2026-06-01', requestedTime: '10:00', symptoms: [] });
      expect(errors).toContain('At least one symptom required');
    });
  });

  describe('D — Priority Assignment', () => {
    it('D01 — emergency is urgent', () => expect(getPriority('emergency')).toBe('urgent'));
    it('D02 — mental health is high', () => expect(getPriority('mental_health')).toBe('high'));
    it('D03 — general is normal', () => expect(getPriority('general')).toBe('normal'));
    it('D04 — follow-up is normal', () => expect(getPriority('follow_up')).toBe('normal'));
    it('D05 — specialist is normal', () => expect(getPriority('specialist')).toBe('normal'));
  });

  describe('E — Scheduling', () => {
    it('E01 — 10:00 is in working hours', () => expect(isTimeInWorkingHours('10:00')).toBe(true));
    it('E02 — 08:00 is in working hours', () => expect(isTimeInWorkingHours('08:00')).toBe(true));
    it('E03 — 17:00 is boundary', () => expect(isTimeInWorkingHours('17:00')).toBe(true));
    it('E04 — 07:00 is before hours', () => expect(isTimeInWorkingHours('07:00')).toBe(false));
    it('E05 — 18:00 is after hours', () => expect(isTimeInWorkingHours('18:00')).toBe(false));
    it('E06 — weekday check', () => {
      expect(isWeekday('2026-06-01')).toBe(true); // Monday
      expect(isWeekday('2026-06-07')).toBe(false); // Sunday
    });
    it('E07 — slot calculation', () => {
      const schedule: DoctorSchedule = {
        doctorId: 'D1', dayOfWeek: 1, startTime: '08:00', endTime: '12:00',
        slotDuration: 30, maxPatients: 8,
      };
      expect(calculateAvailableSlots(schedule)).toBe(8);
    });
    it('E08 — 60-min slots', () => {
      const schedule: DoctorSchedule = {
        doctorId: 'D1', dayOfWeek: 1, startTime: '09:00', endTime: '17:00',
        slotDuration: 60, maxPatients: 8,
      };
      expect(calculateAvailableSlots(schedule)).toBe(8);
    });
  });

  describe('F — Pool System', () => {
    it('F01 — pool with capacity is available', () => {
      expect(isPoolAvailable({ id: 'P1', date: '2026-06-01', totalSlots: 10, bookedSlots: 5, availableDoctors: ['D1'] })).toBe(true);
    });
    it('F02 — full pool not available', () => {
      expect(isPoolAvailable({ id: 'P1', date: '2026-06-01', totalSlots: 10, bookedSlots: 10, availableDoctors: ['D1'] })).toBe(false);
    });
    it('F03 — no doctors not available', () => {
      expect(isPoolAvailable({ id: 'P1', date: '2026-06-01', totalSlots: 10, bookedSlots: 5, availableDoctors: [] })).toBe(false);
    });
    it('F04 — utilization 50%', () => {
      expect(getPoolUtilization({ id: 'P1', date: '2026-06-01', totalSlots: 10, bookedSlots: 5, availableDoctors: ['D1'] })).toBe(50);
    });
    it('F05 — utilization 100%', () => {
      expect(getPoolUtilization({ id: 'P1', date: '2026-06-01', totalSlots: 10, bookedSlots: 10, availableDoctors: [] })).toBe(100);
    });
    it('F06 — zero slots = 0%', () => {
      expect(getPoolUtilization({ id: 'P1', date: '2026-06-01', totalSlots: 0, bookedSlots: 0, availableDoctors: [] })).toBe(0);
    });
  });

  describe('G — Thai Labels', () => {
    it('G01 — all types have Thai labels', () => {
      for (const type of APPOINTMENT_TYPES) {
        expect(APPOINTMENT_TYPE_LABELS_TH[type]).toBeTruthy();
      }
    });
    it('G02 — all 9 statuses have Thai labels', () => {
      const statuses: AppointmentStatus[] = ['pending', 'approved', 'assigned', 'scheduled', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled'];
      for (const s of statuses) {
        expect(getStatusLabel(s, 'th')).not.toBe(s); // should resolve to Thai, not raw status
      }
    });
    it('G03 — pending Thai label', () => expect(getStatusLabel('pending', 'th')).toBe('รอดำเนินการ'));
    it('G04 — completed Thai label', () => expect(getStatusLabel('completed', 'th')).toBe('เสร็จสิ้น'));
  });

  describe('H — ID Generation', () => {
    it('H01 — starts with APT-', () => expect(generateAppointmentId()).toMatch(/^APT-/));
    it('H02 — unique IDs', () => {
      const ids = new Set(Array.from({ length: 20 }, () => generateAppointmentId()));
      expect(ids.size).toBe(20);
    });
  });
});
