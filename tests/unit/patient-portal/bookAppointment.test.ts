/**
 * ═══════════════════════════════════════════════════════════════════════
 * Book Appointment Logic Tests
 * Tests: Form validation, doctor selection, time slot availability
 * ═══════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from 'vitest';

// --- Types ---
interface BookingFormData {
  doctorId?: string;
  specialty?: string;
  appointmentType: 'video_consultation' | 'in_person' | 'phone';
  reason: string;
  symptoms: string[];
  urgencyLevel: 'normal' | 'urgent' | 'emergency';
  requestedDate: string;
  requestedTime: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
  doctorId?: string;
}

interface BookingValidation {
  valid: boolean;
  errors: string[];
}

// --- Functions ---

function validateBookingForm(data: Partial<BookingFormData>): BookingValidation {
  const errors: string[] = [];

  if (!data.appointmentType) errors.push('Appointment type is required');
  if (!data.reason || data.reason.trim().length < 3) errors.push('Reason must be at least 3 characters');
  if (!data.requestedDate) errors.push('Date is required');
  if (!data.requestedTime) errors.push('Time is required');

  // Date must be in the future
  if (data.requestedDate) {
    const reqDate = new Date(data.requestedDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (reqDate < today) errors.push('Date must be in the future');
  }

  // Time format validation
  if (data.requestedTime && !/^\d{2}:\d{2}$/.test(data.requestedTime)) {
    errors.push('Time must be in HH:MM format');
  }

  // Symptoms validation for urgent/emergency
  if (data.urgencyLevel === 'emergency' && (!data.symptoms || data.symptoms.length === 0)) {
    errors.push('Symptoms required for emergency appointments');
  }

  return { valid: errors.length === 0, errors };
}

function generateTimeSlots(startHour: number, endHour: number, intervalMin: number): TimeSlot[] {
  const slots: TimeSlot[] = [];
  for (let h = startHour; h < endHour; h++) {
    for (let m = 0; m < 60; m += intervalMin) {
      slots.push({
        time: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
        available: true,
      });
    }
  }
  return slots;
}

function markUnavailable(slots: TimeSlot[], bookedTimes: string[]): TimeSlot[] {
  return slots.map(s => ({
    ...s,
    available: !bookedTimes.includes(s.time),
  }));
}

function getAvailableSlots(slots: TimeSlot[]): TimeSlot[] {
  return slots.filter(s => s.available);
}

function calculateUrgencyPriority(urgency: string): number {
  switch (urgency) {
    case 'emergency': return 1;
    case 'urgent': return 2;
    case 'normal': return 3;
    default: return 4;
  }
}

function matchDoctorBySpecialty(
  doctors: { id: string; specialty: string; available: boolean }[],
  specialty: string
): { id: string; specialty: string; available: boolean }[] {
  return doctors.filter(d => d.available && d.specialty.toLowerCase().includes(specialty.toLowerCase()));
}

// --- Tests ---

describe('Booking — Form Validation', () => {
  it('B01 — valid form passes', () => {
    const result = validateBookingForm({
      appointmentType: 'video_consultation',
      reason: 'Annual checkup',
      requestedDate: '2026-12-15',
      requestedTime: '10:00',
      urgencyLevel: 'normal',
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('B02 — missing type fails', () => {
    const result = validateBookingForm({ reason: 'Test', requestedDate: '2026-12-15', requestedTime: '10:00' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Appointment type is required');
  });

  it('B03 — short reason fails', () => {
    const result = validateBookingForm({ appointmentType: 'video_consultation', reason: 'Hi', requestedDate: '2026-12-15', requestedTime: '10:00' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Reason must be at least 3 characters');
  });

  it('B04 — past date fails', () => {
    const result = validateBookingForm({ appointmentType: 'video_consultation', reason: 'Checkup', requestedDate: '2020-01-01', requestedTime: '10:00' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Date must be in the future');
  });

  it('B05 — invalid time format fails', () => {
    const result = validateBookingForm({ appointmentType: 'video_consultation', reason: 'Checkup', requestedDate: '2026-12-15', requestedTime: '10am' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Time must be in HH:MM format');
  });

  it('B06 — emergency without symptoms fails', () => {
    const result = validateBookingForm({ appointmentType: 'video_consultation', reason: 'Emergency', requestedDate: '2026-12-15', requestedTime: '10:00', urgencyLevel: 'emergency', symptoms: [] });
    expect(result.valid).toBe(false);
  });

  it('B07 — emergency with symptoms passes', () => {
    const result = validateBookingForm({ appointmentType: 'video_consultation', reason: 'Emergency', requestedDate: '2026-12-15', requestedTime: '10:00', urgencyLevel: 'emergency', symptoms: ['chest pain'] });
    expect(result.valid).toBe(true);
  });
});

describe('Booking — Time Slots', () => {
  it('B08 — generates correct number of 30min slots (9-17)', () => {
    const slots = generateTimeSlots(9, 17, 30);
    expect(slots).toHaveLength(16); // 8 hours * 2 slots/hour
  });

  it('B09 — all generated slots are available', () => {
    const slots = generateTimeSlots(9, 12, 30);
    expect(slots.every(s => s.available)).toBe(true);
  });

  it('B10 — mark booked times as unavailable', () => {
    const slots = generateTimeSlots(9, 12, 30);
    const updated = markUnavailable(slots, ['09:00', '10:30']);
    expect(updated.find(s => s.time === '09:00')?.available).toBe(false);
    expect(updated.find(s => s.time === '10:30')?.available).toBe(false);
    expect(updated.find(s => s.time === '09:30')?.available).toBe(true);
  });

  it('B11 — getAvailableSlots filters correctly', () => {
    const slots = markUnavailable(generateTimeSlots(9, 10, 30), ['09:00']);
    const avail = getAvailableSlots(slots);
    expect(avail).toHaveLength(1);
    expect(avail[0].time).toBe('09:30');
  });
});

describe('Booking — Urgency & Doctor Matching', () => {
  it('B12 — emergency has highest priority (1)', () => {
    expect(calculateUrgencyPriority('emergency')).toBe(1);
  });

  it('B13 — normal has lowest priority (3)', () => {
    expect(calculateUrgencyPriority('normal')).toBe(3);
  });

  it('B14 — priority ordering: emergency < urgent < normal', () => {
    expect(calculateUrgencyPriority('emergency')).toBeLessThan(calculateUrgencyPriority('urgent'));
    expect(calculateUrgencyPriority('urgent')).toBeLessThan(calculateUrgencyPriority('normal'));
  });

  it('B15 — match doctor by specialty', () => {
    const doctors = [
      { id: '1', specialty: 'General Medicine', available: true },
      { id: '2', specialty: 'Cardiology', available: true },
      { id: '3', specialty: 'General Medicine', available: false },
    ];
    const matches = matchDoctorBySpecialty(doctors, 'general');
    expect(matches).toHaveLength(1);
    expect(matches[0].id).toBe('1');
  });

  it('B16 — no match returns empty', () => {
    const doctors = [{ id: '1', specialty: 'Cardiology', available: true }];
    expect(matchDoctorBySpecialty(doctors, 'neurology')).toHaveLength(0);
  });
});
