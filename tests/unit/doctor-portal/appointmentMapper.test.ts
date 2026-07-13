import { describe, expect, it } from 'vitest';
import { mapAppointmentForClient } from '../../../Isara-doctor-portal/backend/appointmentMapper.cjs';
import { resolveAppointmentSchedule, normalizeAppointmentTime } from '../../../Isara-doctor-portal/frontend/utils/appointmentSchedule';

describe('mapAppointmentForClient', () => {
  it('maps snake_case confirmed telehealth row to camelCase UI fields', () => {
    const mapped = mapAppointmentForClient({
      id: 'APT-001',
      doctor_id: 'DOC-TEST-001',
      patient_id: 'PATIENT-DEMO',
      patient_name: 'Demo Patient',
      status: 'confirmed',
      confirmed_date: '2026-06-10',
      confirmed_time: '14:00',
      meeting_link: 'https://meet.jit.si/izara-test',
      appointment_type: 'telehealth',
    });

    expect(mapped.doctorId).toBe('DOC-TEST-001');
    expect(mapped.patientName).toBe('Demo Patient');
    expect(mapped.appointmentDate).toBe('2026-06-10');
    expect(mapped.appointmentTime).toBe('14:00');
    expect(mapped.meetingLink).toBe('https://meet.jit.si/izara-test');
    expect(mapped.status).toBe('confirmed');
  });
});

describe('resolveAppointmentSchedule', () => {
  it('prefers confirmed_date over requested_date', () => {
    const { date, time } = resolveAppointmentSchedule({
      confirmed_date: '2026-06-15',
      confirmed_time: '09:30',
      requested_date: '2026-06-01',
      requested_time: '08:00',
    });
    expect(date).toBe('2026-06-15');
    expect(time).toBe('09:30');
  });

  it('maps preferredTimeSlot morning/afternoon/evening to HH:mm', () => {
    expect(normalizeAppointmentTime('morning')).toBe('10:00');
    expect(normalizeAppointmentTime('afternoon')).toBe('14:00');
    expect(normalizeAppointmentTime('evening')).toBe('18:00');
    expect(resolveAppointmentSchedule({
      requested_date: '2026-07-20',
      preferred_time_slot: 'morning',
    }).time).toBe('10:00');
  });
});
