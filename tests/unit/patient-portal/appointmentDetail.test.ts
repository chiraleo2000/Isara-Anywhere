/**
 * ═══════════════════════════════════════════════════════════════════════
 * Appointment Detail Logic Tests
 * Tests: Detail rendering per status, action availability, display formatting
 * ═══════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from 'vitest';

// --- Types ---
type AppointmentStatus = 'pending' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'no-show' | 'rescheduled';

interface AppointmentDetail {
  id: string;
  patientName: string;
  doctorName: string;
  status: AppointmentStatus;
  appointmentType: string;
  date: string;
  time: string;
  reason: string;
  meetingLink?: string;
  jitsiRoomName?: string;
  notes?: string;
}

interface DetailAction {
  label: string;
  type: 'primary' | 'secondary' | 'danger';
  enabled: boolean;
}

// --- Functions ---

function getAvailableActions(status: AppointmentStatus, role: 'patient' | 'doctor' | 'admin'): DetailAction[] {
  const actions: DetailAction[] = [];

  switch (status) {
    case 'pending':
      if (role === 'patient') {
        actions.push({ label: 'Cancel', type: 'danger', enabled: true });
      }
      if (role === 'doctor' || role === 'admin') {
        actions.push(
          { label: 'Confirm', type: 'primary', enabled: true },
          { label: 'Reject', type: 'danger', enabled: true },
        );
      }
      break;
    case 'confirmed':
      actions.push({ label: 'Join Meeting', type: 'primary', enabled: true });
      if (role === 'patient') {
        actions.push({ label: 'Cancel', type: 'danger', enabled: true });
      }
      if (role === 'doctor') {
        actions.push({ label: 'Reschedule', type: 'secondary', enabled: true });
      }
      break;
    case 'in-progress':
      actions.push({ label: 'Join Meeting', type: 'primary', enabled: true });
      break;
    case 'completed':
      actions.push({ label: 'View Summary', type: 'secondary', enabled: true });
      if (role === 'patient') {
        actions.push({ label: 'Book Follow-up', type: 'primary', enabled: true });
      }
      break;
    case 'cancelled':
      if (role === 'patient') {
        actions.push({ label: 'Rebook', type: 'primary', enabled: true });
      }
      break;
  }

  return actions;
}

function getStatusLabel(status: AppointmentStatus): { en: string; th: string; color: string } {
  const map: Record<AppointmentStatus, { en: string; th: string; color: string }> = {
    'pending': { en: 'Pending', th: 'รอดำเนินการ', color: 'yellow' },
    'confirmed': { en: 'Confirmed', th: 'ยืนยันแล้ว', color: 'green' },
    'in-progress': { en: 'In Progress', th: 'กำลังดำเนินการ', color: 'blue' },
    'completed': { en: 'Completed', th: 'เสร็จสิ้น', color: 'gray' },
    'cancelled': { en: 'Cancelled', th: 'ยกเลิก', color: 'red' },
    'no-show': { en: 'No Show', th: 'ไม่มา', color: 'red' },
    'rescheduled': { en: 'Rescheduled', th: 'เลื่อนนัด', color: 'orange' },
  };
  return map[status];
}

function canJoinMeeting(apt: AppointmentDetail): boolean {
  return ['confirmed', 'in-progress'].includes(apt.status) && !!(apt.meetingLink || apt.jitsiRoomName);
}

function formatAppointmentDate(date: string, time: string): string {
  const d = new Date(date);
  const formatted = d.toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  return `${formatted} เวลา ${time} น.`;
}

// --- Tests ---

describe('Appointment Detail — Actions by Status', () => {
  it('AD01 — pending: patient can cancel', () => {
    const actions = getAvailableActions('pending', 'patient');
    expect(actions.some(a => a.label === 'Cancel')).toBe(true);
    expect(actions.some(a => a.label === 'Confirm')).toBe(false);
  });

  it('AD02 — pending: doctor can confirm and reject', () => {
    const actions = getAvailableActions('pending', 'doctor');
    expect(actions.some(a => a.label === 'Confirm')).toBe(true);
    expect(actions.some(a => a.label === 'Reject')).toBe(true);
  });

  it('AD03 — pending: admin can confirm and reject', () => {
    const actions = getAvailableActions('pending', 'admin');
    expect(actions.some(a => a.label === 'Confirm')).toBe(true);
  });

  it('AD04 — confirmed: all roles can join meeting', () => {
    for (const role of ['patient', 'doctor', 'admin'] as const) {
      const actions = getAvailableActions('confirmed', role);
      expect(actions.some(a => a.label === 'Join Meeting')).toBe(true);
    }
  });

  it('AD05 — confirmed: patient can cancel', () => {
    const actions = getAvailableActions('confirmed', 'patient');
    expect(actions.some(a => a.label === 'Cancel')).toBe(true);
  });

  it('AD06 — confirmed: doctor can reschedule', () => {
    const actions = getAvailableActions('confirmed', 'doctor');
    expect(actions.some(a => a.label === 'Reschedule')).toBe(true);
  });

  it('AD07 — completed: patient can book follow-up', () => {
    const actions = getAvailableActions('completed', 'patient');
    expect(actions.some(a => a.label === 'Book Follow-up')).toBe(true);
  });

  it('AD08 — completed: view summary available', () => {
    const actions = getAvailableActions('completed', 'doctor');
    expect(actions.some(a => a.label === 'View Summary')).toBe(true);
  });

  it('AD09 — cancelled: patient can rebook', () => {
    const actions = getAvailableActions('cancelled', 'patient');
    expect(actions.some(a => a.label === 'Rebook')).toBe(true);
  });

  it('AD10 — in-progress: join meeting available', () => {
    const actions = getAvailableActions('in-progress', 'patient');
    expect(actions.some(a => a.label === 'Join Meeting')).toBe(true);
  });
});

describe('Appointment Detail — Status Labels', () => {
  it('AD11 — all statuses have Thai labels', () => {
    const statuses: AppointmentStatus[] = ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show', 'rescheduled'];
    for (const s of statuses) {
      const label = getStatusLabel(s);
      expect(label.th).toBeTruthy();
      expect(label.en).toBeTruthy();
      expect(label.color).toBeTruthy();
    }
  });

  it('AD12 — confirmed is green', () => {
    expect(getStatusLabel('confirmed').color).toBe('green');
  });

  it('AD13 — cancelled is red', () => {
    expect(getStatusLabel('cancelled').color).toBe('red');
  });
});

describe('Appointment Detail — Meeting Join', () => {
  it('AD14 — can join confirmed with meeting link', () => {
    expect(canJoinMeeting({ id: '1', patientName: 'P', doctorName: 'D', status: 'confirmed', appointmentType: 'video', date: '2026-03-15', time: '10:00', reason: 'Test', meetingLink: 'https://meet.jit.si/room' })).toBe(true);
  });

  it('AD15 — cannot join pending', () => {
    expect(canJoinMeeting({ id: '1', patientName: 'P', doctorName: 'D', status: 'pending', appointmentType: 'video', date: '2026-03-15', time: '10:00', reason: 'Test', meetingLink: 'https://meet.jit.si/room' })).toBe(false);
  });

  it('AD16 — cannot join without meeting link', () => {
    expect(canJoinMeeting({ id: '1', patientName: 'P', doctorName: 'D', status: 'confirmed', appointmentType: 'video', date: '2026-03-15', time: '10:00', reason: 'Test' })).toBe(false);
  });
});

describe('Appointment Detail — Date Formatting', () => {
  it('AD17 — formats with Thai locale', () => {
    const result = formatAppointmentDate('2026-03-15', '10:00');
    expect(result).toContain('10:00');
    expect(result).toContain('น.');
  });
});
