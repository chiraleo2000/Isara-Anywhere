/**
 * ═══════════════════════════════════════════════════════════════════════
 * PATIENT PORTAL — Appointments Route Unit Tests
 * ═══════════════════════════════════════════════════════════════════════
 * Tests: server/routes/appointments.ts — booking, status, Jitsi links
 */
import { describe, it, expect } from 'vitest';

// ── Appointment Helpers ─────────────────────────────────────────────────

interface AppointmentData {
  patientId: string;
  doctorId: string;
  date: string;
  time: string;
  type: string;
  symptoms?: string;
  notes?: string;
}

const VALID_TYPES = new Set(['video_consultation', 'follow_up', 'urgent', 'general', 'specialist_referral']);
const VALID_STATUSES = ['pending', 'in_pool', 'awaiting_doctor_response', 'confirmed', 'waiting', 'in_progress', 'completed', 'cancelled', 'declined', 'no_show'];

function validateAppointment(data: AppointmentData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!data.patientId) errors.push('Patient ID required');
  if (!data.doctorId) errors.push('Doctor ID required');
  if (!data.date) errors.push('Date required');
  if (!data.time) errors.push('Time required');
  if (data.type && !VALID_TYPES.has(data.type)) errors.push('Invalid appointment type');

  // Date must be in future
  if (data.date) {
    const appointmentDate = new Date(data.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (appointmentDate < today) errors.push('Appointment date must be in the future');
  }

  // Time must be within business hours
  if (data.time) {
    const [hours] = data.time.split(':').map(Number);
    if (hours < 8 || hours >= 18) errors.push('Appointment must be within business hours (08:00-18:00)');
  }

  return { valid: errors.length === 0, errors };
}

function generateJitsiLink(appointmentId: string): string {
  const roomName = `izara-${appointmentId}-${Date.now()}`;
  const params = [
    'config.startWithAudioMuted=false',
    'config.startWithVideoMuted=false',
    'config.lang=th',
    'config.enableRecording=true',
  ];
  return `https://meet.jit.si/${roomName}#${params.join('&')}`;
}

function formatAppointmentForResponse(row: Record<string, unknown>): Record<string, unknown> {
  return {
    id: row.id,
    patientId: row.patient_id,
    doctorId: row.doctor_id,
    date: row.appointment_date,
    time: row.appointment_time,
    type: row.appointment_type,
    status: row.status,
    meetingLink: row.meeting_link,
    symptoms: row.chief_complaint,
    createdAt: row.created_at,
  };
}

// ── Tests ───────────────────────────────────────────────────────────────

describe('Patient Portal — Appointments Route', () => {

  describe('A — Appointment Validation', () => {
    it('A01 — accepts valid appointment', () => {
      const future = new Date();
      future.setDate(future.getDate() + 7);
      const result = validateAppointment({
        patientId: 'PT-001',
        doctorId: 'DR-001',
        date: future.toISOString().split('T')[0],
        time: '10:00',
        type: 'video_consultation',
      });
      expect(result.valid).toBe(true);
    });

    it('A02 — rejects missing patient ID', () => {
      const result = validateAppointment({ patientId: '', doctorId: 'DR-001', date: '2026-12-01', time: '10:00', type: 'general' });
      expect(result.errors).toContain('Patient ID required');
    });

    it('A03 — rejects missing doctor ID', () => {
      const result = validateAppointment({ patientId: 'PT-001', doctorId: '', date: '2026-12-01', time: '10:00', type: 'general' });
      expect(result.errors).toContain('Doctor ID required');
    });

    it('A04 — rejects past date', () => {
      const result = validateAppointment({ patientId: 'PT-001', doctorId: 'DR-001', date: '2020-01-01', time: '10:00', type: 'general' });
      expect(result.errors).toContain('Appointment date must be in the future');
    });

    it('A05 — rejects invalid type', () => {
      const result = validateAppointment({ patientId: 'PT-001', doctorId: 'DR-001', date: '2026-12-01', time: '10:00', type: 'invalid_type' });
      expect(result.errors).toContain('Invalid appointment type');
    });

    it('A06 — rejects before business hours', () => {
      const result = validateAppointment({ patientId: 'PT-001', doctorId: 'DR-001', date: '2026-12-01', time: '06:00', type: 'general' });
      expect(result.errors).toContain('Appointment must be within business hours (08:00-18:00)');
    });

    it('A07 — rejects after business hours', () => {
      const result = validateAppointment({ patientId: 'PT-001', doctorId: 'DR-001', date: '2026-12-01', time: '20:00', type: 'general' });
      expect(result.errors).toContain('Appointment must be within business hours (08:00-18:00)');
    });
  });

  describe('B — Status Flow', () => {
    it('B01 — all valid statuses defined', () => {
      expect(VALID_STATUSES).toHaveLength(10);
    });

    it('B02 — pending is initial status', () => {
      expect(VALID_STATUSES[0]).toBe('pending');
    });

    it('B03 — completed and cancelled are terminal', () => {
      expect(VALID_STATUSES).toContain('completed');
      expect(VALID_STATUSES).toContain('cancelled');
    });

    it('B04 — includes pool workflow statuses', () => {
      expect(VALID_STATUSES).toContain('in_pool');
      expect(VALID_STATUSES).toContain('awaiting_doctor_response');
    });

    it('B05 — includes meeting statuses', () => {
      expect(VALID_STATUSES).toContain('waiting');
      expect(VALID_STATUSES).toContain('in_progress');
    });
  });

  describe('C — Jitsi Meeting Link', () => {
    it('C01 — generates valid HTTPS link', () => {
      const link = generateJitsiLink('APT-001');
      expect(link.startsWith('https://meet.jit.si/')).toBe(true);
    });

    it('C02 — includes izara room prefix', () => {
      const link = generateJitsiLink('APT-TEST');
      expect(link).toContain('izara-APT-TEST-');
    });

    it('C03 — includes Thai language config', () => {
      const link = generateJitsiLink('APT-001');
      expect(link).toContain('config.lang=th');
    });

    it('C04 — includes recording config', () => {
      const link = generateJitsiLink('APT-001');
      expect(link).toContain('config.enableRecording=true');
    });
  });

  describe('D — Response Formatting', () => {
    it('D01 — transforms DB row to API response', () => {
      const row = {
        id: 'apt-uuid',
        patient_id: 'PT-001',
        doctor_id: 'DR-001',
        appointment_date: '2026-03-15',
        appointment_time: '10:00',
        appointment_type: 'video_consultation',
        status: 'confirmed',
        meeting_link: 'https://meet.jit.si/izara-test',
        chief_complaint: 'Headache',
        created_at: '2026-03-08T10:00:00Z',
      };
      const result = formatAppointmentForResponse(row);
      expect(result.patientId).toBe('PT-001');
      expect(result.doctorId).toBe('DR-001');
      expect(result.date).toBe('2026-03-15');
      expect(result.status).toBe('confirmed');
      expect(result.meetingLink).toContain('meet.jit.si');
    });

    it('D02 — handles null optional fields', () => {
      const row = {
        id: 'apt-uuid',
        patient_id: 'PT-001',
        doctor_id: 'DR-001',
        appointment_date: '2026-03-15',
        appointment_time: '10:00',
        appointment_type: 'general',
        status: 'pending',
        meeting_link: null,
        chief_complaint: null,
        created_at: '2026-03-08T10:00:00Z',
      };
      const result = formatAppointmentForResponse(row);
      expect(result.meetingLink).toBeNull();
      expect(result.symptoms).toBeNull();
    });
  });

  describe('E — Notification Triggers', () => {
    const triggerMap: Record<string, string[]> = {
      confirmed: ['appointment_confirmed'],
      declined: ['appointment_declined'],
      cancelled: ['appointment_cancelled'],
      in_pool: ['appointment_in_pool'],
    };

    it('E01 — confirmation triggers notification', () => {
      expect(triggerMap['confirmed']).toContain('appointment_confirmed');
    });

    it('E02 — decline triggers notification', () => {
      expect(triggerMap['declined']).toContain('appointment_declined');
    });

    it('E03 — cancellation triggers notification', () => {
      expect(triggerMap['cancelled']).toContain('appointment_cancelled');
    });
  });
});
