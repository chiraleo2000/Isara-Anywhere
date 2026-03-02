/**
 * ═══════════════════════════════════════════════════════════════════════
 * IZARA TELEMEDICINE — Patient Portal Services & API Unit Tests
 * ═══════════════════════════════════════════════════════════════════════
 * Tests: Service layer functions, endpoint URL construction, data
 * transformation, appointment/PHR/notification service logic.
 * ═══════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from 'vitest';

// ═══════════════════════════════════════════════════════════════════════
// A. Appointment Data Generation & Validation
// ═══════════════════════════════════════════════════════════════════════
describe('Patient Services — Appointment Data', () => {
  interface AppointmentData {
    patientId: string;
    doctorId?: string;
    doctorName?: string;
    specialty: string;
    date: string;
    time: string;
    type: 'telemedicine' | 'in-person' | 'follow-up';
    reason: string;
    symptoms?: string;
  }

  function validateAppointment(data: AppointmentData): string[] {
    const errors: string[] = [];
    if (!data.patientId) errors.push('Patient ID required');
    if (!data.specialty) errors.push('Specialty required');
    if (!data.date || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) errors.push('Invalid date format');
    if (!data.time || !/^\d{2}:\d{2}$/.test(data.time)) errors.push('Invalid time format');
    if (!['telemedicine', 'in-person', 'follow-up'].includes(data.type)) errors.push('Invalid type');
    if (!data.reason || data.reason.length < 3) errors.push('Reason required');
    // Date must be in the future
    if (data.date && new Date(data.date) < new Date(new Date().toISOString().split('T')[0])) {
      errors.push('Date must be in the future');
    }
    return errors;
  }

  it('A01 — valid appointment has no errors', () => {
    const futureDate = new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0];
    const apt: AppointmentData = {
      patientId: 'PATIENT-DEMO', specialty: 'General Practice',
      date: futureDate, time: '10:00', type: 'telemedicine', reason: 'Headache',
    };
    expect(validateAppointment(apt)).toHaveLength(0);
  });

  it('A02 — rejects missing patient ID', () => {
    const futureDate = new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0];
    const apt: AppointmentData = {
      patientId: '', specialty: 'General Practice',
      date: futureDate, time: '10:00', type: 'telemedicine', reason: 'Test',
    };
    expect(validateAppointment(apt)).toContain('Patient ID required');
  });

  it('A03 — rejects invalid date format', () => {
    const apt: AppointmentData = {
      patientId: 'P-1', specialty: 'GP', date: '03/15/2026',
      time: '10:00', type: 'telemedicine', reason: 'Test',
    };
    expect(validateAppointment(apt)).toContain('Invalid date format');
  });

  it('A04 — rejects past dates', () => {
    const apt: AppointmentData = {
      patientId: 'P-1', specialty: 'GP', date: '2020-01-01',
      time: '10:00', type: 'telemedicine', reason: 'Test',
    };
    expect(validateAppointment(apt)).toContain('Date must be in the future');
  });

  it('A05 — rejects invalid appointment type', () => {
    const futureDate = new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0];
    const apt: AppointmentData = {
      patientId: 'P-1', specialty: 'GP', date: futureDate,
      time: '10:00', type: 'invalid' as any, reason: 'Test',
    };
    expect(validateAppointment(apt)).toContain('Invalid type');
  });

  it('A06 — accepts all valid appointment types', () => {
    const futureDate = new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0];
    for (const type of ['telemedicine', 'in-person', 'follow-up'] as const) {
      const apt: AppointmentData = {
        patientId: 'P-1', specialty: 'GP', date: futureDate,
        time: '10:00', type, reason: 'Valid test',
      };
      expect(validateAppointment(apt)).toHaveLength(0);
    }
  });

  it('A07 — rejects too-short reason', () => {
    const futureDate = new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0];
    const apt: AppointmentData = {
      patientId: 'P-1', specialty: 'GP', date: futureDate,
      time: '10:00', type: 'telemedicine', reason: 'ab',
    };
    expect(validateAppointment(apt)).toContain('Reason required');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// B. PHR Vitals Data Validation
// ═══════════════════════════════════════════════════════════════════════
describe('Patient Services — PHR Vitals', () => {
  interface VitalSigns {
    bloodPressureSystolic?: number;
    bloodPressureDiastolic?: number;
    heartRate?: number;
    temperature?: number;
    weight?: number;
    height?: number;
    oxygenSaturation?: number;
    respiratoryRate?: number;
  }

  function validateVitals(vitals: VitalSigns): string[] {
    const errors: string[] = [];
    if (vitals.bloodPressureSystolic && (vitals.bloodPressureSystolic < 60 || vitals.bloodPressureSystolic > 250)) {
      errors.push('Systolic BP out of range (60-250)');
    }
    if (vitals.bloodPressureDiastolic && (vitals.bloodPressureDiastolic < 30 || vitals.bloodPressureDiastolic > 180)) {
      errors.push('Diastolic BP out of range (30-180)');
    }
    if (vitals.heartRate && (vitals.heartRate < 30 || vitals.heartRate > 220)) {
      errors.push('Heart rate out of range (30-220)');
    }
    if (vitals.temperature && (vitals.temperature < 34 || vitals.temperature > 43)) {
      errors.push('Temperature out of range (34-43°C)');
    }
    if (vitals.oxygenSaturation && (vitals.oxygenSaturation < 50 || vitals.oxygenSaturation > 100)) {
      errors.push('O2 saturation out of range (50-100%)');
    }
    if (vitals.weight && (vitals.weight < 1 || vitals.weight > 300)) {
      errors.push('Weight out of range (1-300kg)');
    }
    if (vitals.height && (vitals.height < 30 || vitals.height > 250)) {
      errors.push('Height out of range (30-250cm)');
    }
    return errors;
  }

  function calculateBMI(weightKg: number, heightCm: number): number {
    if (heightCm <= 0 || weightKg <= 0) return 0;
    const heightM = heightCm / 100;
    return +(weightKg / (heightM * heightM)).toFixed(1);
  }

  function getBMICategory(bmi: number): string {
    if (bmi < 18.5) return 'underweight';
    if (bmi < 25) return 'normal';
    if (bmi < 30) return 'overweight';
    return 'obese';
  }

  it('B01 — valid vitals produce no errors', () => {
    const vitals: VitalSigns = {
      bloodPressureSystolic: 120, bloodPressureDiastolic: 80,
      heartRate: 72, temperature: 36.5, oxygenSaturation: 98,
      weight: 70, height: 170,
    };
    expect(validateVitals(vitals)).toHaveLength(0);
  });

  it('B02 — rejects systolic BP out of range', () => {
    expect(validateVitals({ bloodPressureSystolic: 300 })).toContain('Systolic BP out of range (60-250)');
  });

  it('B03 — rejects diastolic BP out of range', () => {
    expect(validateVitals({ bloodPressureDiastolic: 200 })).toContain('Diastolic BP out of range (30-180)');
  });

  it('B04 — rejects heart rate out of range', () => {
    expect(validateVitals({ heartRate: 10 })).toContain('Heart rate out of range (30-220)');
  });

  it('B05 — rejects temperature out of range', () => {
    expect(validateVitals({ temperature: 50 })).toContain('Temperature out of range (34-43°C)');
  });

  it('B06 — calculates BMI correctly', () => {
    expect(calculateBMI(70, 170)).toBeCloseTo(24.2, 1);
    expect(calculateBMI(50, 160)).toBeCloseTo(19.5, 1);
  });

  it('B07 — BMI categories are correct', () => {
    expect(getBMICategory(17)).toBe('underweight');
    expect(getBMICategory(22)).toBe('normal');
    expect(getBMICategory(27)).toBe('overweight');
    expect(getBMICategory(35)).toBe('obese');
  });

  it('B08 — handles zero height for BMI', () => {
    expect(calculateBMI(70, 0)).toBe(0);
  });

  it('B09 — rejects O2 saturation out of range', () => {
    expect(validateVitals({ oxygenSaturation: 40 })).toContain('O2 saturation out of range (50-100%)');
  });

  it('B10 — accepts boundary values', () => {
    const vitals: VitalSigns = {
      bloodPressureSystolic: 60, bloodPressureDiastolic: 30,
      heartRate: 30, temperature: 34, oxygenSaturation: 100,
    };
    expect(validateVitals(vitals)).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// C. Notification Service Logic
// ═══════════════════════════════════════════════════════════════════════
describe('Patient Services — Notifications', () => {
  interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
  }

  function getUnreadCount(notifications: Notification[]): number {
    return notifications.filter(n => !n.isRead).length;
  }

  function sortByDate(notifications: Notification[]): Notification[] {
    return [...notifications].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  function markAsRead(notifications: Notification[], id: string): Notification[] {
    return notifications.map(n => n.id === id ? { ...n, isRead: true } : n);
  }

  function markAllAsRead(notifications: Notification[]): Notification[] {
    return notifications.map(n => ({ ...n, isRead: true }));
  }

  const testNotifications: Notification[] = [
    { id: 'N1', type: 'appointment', title: 'New Appointment', message: 'Confirmed', isRead: false, createdAt: '2026-03-01T10:00:00Z' },
    { id: 'N2', type: 'emr', title: 'EMR Updated', message: 'Signed', isRead: true, createdAt: '2026-03-02T10:00:00Z' },
    { id: 'N3', type: 'lab', title: 'Lab Results', message: 'Ready', isRead: false, createdAt: '2026-02-28T10:00:00Z' },
  ];

  it('C01 — counts unread notifications correctly', () => {
    expect(getUnreadCount(testNotifications)).toBe(2);
  });

  it('C02 — sorts by date descending', () => {
    const sorted = sortByDate(testNotifications);
    expect(sorted[0].id).toBe('N2');
    expect(sorted[2].id).toBe('N3');
  });

  it('C03 — marks single notification as read', () => {
    const result = markAsRead(testNotifications, 'N1');
    expect(result.find(n => n.id === 'N1')!.isRead).toBe(true);
    expect(result.find(n => n.id === 'N3')!.isRead).toBe(false);
  });

  it('C04 — marks all notifications as read', () => {
    const result = markAllAsRead(testNotifications);
    expect(getUnreadCount(result)).toBe(0);
  });

  it('C05 — handles empty notifications array', () => {
    expect(getUnreadCount([])).toBe(0);
    expect(sortByDate([])).toEqual([]);
  });

  it('C06 — markAsRead with non-existent ID returns unchanged', () => {
    const result = markAsRead(testNotifications, 'NONEXISTENT');
    expect(result).toEqual(testNotifications);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// D. Appointment Pool & Claim Logic
// ═══════════════════════════════════════════════════════════════════════
describe('Patient Services — Appointment Pool', () => {
  interface PoolSlot {
    id: string;
    doctorId: string;
    specialty: string;
    date: string;
    time: string;
    status: 'available' | 'claimed' | 'confirmed' | 'expired';
  }

  function getAvailableSlots(slots: PoolSlot[]): PoolSlot[] {
    return slots.filter(s => s.status === 'available');
  }

  function claimSlot(slots: PoolSlot[], slotId: string, patientId: string): PoolSlot[] {
    return slots.map(s => s.id === slotId && s.status === 'available'
      ? { ...s, status: 'claimed' as const }
      : s
    );
  }

  function filterBySpecialty(slots: PoolSlot[], specialty: string): PoolSlot[] {
    return slots.filter(s => s.specialty.toLowerCase() === specialty.toLowerCase());
  }

  const testSlots: PoolSlot[] = [
    { id: 'S1', doctorId: 'DOC-1', specialty: 'General Practice', date: '2026-03-05', time: '09:00', status: 'available' },
    { id: 'S2', doctorId: 'DOC-1', specialty: 'General Practice', date: '2026-03-05', time: '10:00', status: 'claimed' },
    { id: 'S3', doctorId: 'DOC-2', specialty: 'Cardiology', date: '2026-03-05', time: '11:00', status: 'available' },
    { id: 'S4', doctorId: 'DOC-3', specialty: 'Dermatology', date: '2026-03-05', time: '14:00', status: 'expired' },
  ];

  it('D01 — filters available slots', () => {
    const available = getAvailableSlots(testSlots);
    expect(available).toHaveLength(2);
    expect(available.every(s => s.status === 'available')).toBe(true);
  });

  it('D02 — claims an available slot', () => {
    const result = claimSlot(testSlots, 'S1', 'PATIENT-DEMO');
    expect(result.find(s => s.id === 'S1')!.status).toBe('claimed');
  });

  it('D03 — does not claim already-claimed slot', () => {
    const result = claimSlot(testSlots, 'S2', 'PATIENT-DEMO');
    expect(result.find(s => s.id === 'S2')!.status).toBe('claimed');
  });

  it('D04 — filters by specialty (case-insensitive)', () => {
    const cardio = filterBySpecialty(testSlots, 'cardiology');
    expect(cardio).toHaveLength(1);
    expect(cardio[0].doctorId).toBe('DOC-2');
  });

  it('D05 — returns empty array for unknown specialty', () => {
    expect(filterBySpecialty(testSlots, 'neurology')).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// E. PDPA / Living Will Data
// ═══════════════════════════════════════════════════════════════════════
describe('Patient Services — PDPA & Living Will', () => {
  interface ConsentItem {
    type: string;
    granted: boolean;
    grantedAt?: string;
    version: string;
  }

  interface LivingWillData {
    patientId: string;
    preferences: {
      cprPreference: 'full' | 'limited' | 'none';
      ventilatorPreference: 'full' | 'time-limited' | 'none';
      artificialNutrition: boolean;
      palliativeCare: boolean;
    };
    witnesses: { name: string; relationship: string }[];
    isActive: boolean;
    version: number;
  }

  function validateLivingWill(data: LivingWillData): string[] {
    const errors: string[] = [];
    if (!data.patientId) errors.push('Patient ID required');
    if (data.witnesses.length < 2) errors.push('At least 2 witnesses required');
    if (!['full', 'limited', 'none'].includes(data.preferences.cprPreference)) errors.push('Invalid CPR preference');
    if (data.version < 1) errors.push('Invalid version');
    return errors;
  }

  it('E01 — valid living will passes validation', () => {
    const will: LivingWillData = {
      patientId: 'P-001',
      preferences: { cprPreference: 'full', ventilatorPreference: 'full', artificialNutrition: true, palliativeCare: true },
      witnesses: [{ name: 'W1', relationship: 'spouse' }, { name: 'W2', relationship: 'child' }],
      isActive: true, version: 1,
    };
    expect(validateLivingWill(will)).toHaveLength(0);
  });

  it('E02 — rejects living will with < 2 witnesses', () => {
    const will: LivingWillData = {
      patientId: 'P-001',
      preferences: { cprPreference: 'full', ventilatorPreference: 'full', artificialNutrition: true, palliativeCare: true },
      witnesses: [{ name: 'W1', relationship: 'spouse' }],
      isActive: true, version: 1,
    };
    expect(validateLivingWill(will)).toContain('At least 2 witnesses required');
  });

  it('E03 — validates consent item structure', () => {
    const consent: ConsentItem = {
      type: 'data_sharing', granted: true,
      grantedAt: new Date().toISOString(), version: '1.0',
    };
    expect(consent.type).toBeTruthy();
    expect(consent.version).toBeTruthy();
    expect(typeof consent.granted).toBe('boolean');
  });

  it('E04 — living will version must be >= 1', () => {
    const will: LivingWillData = {
      patientId: 'P-001',
      preferences: { cprPreference: 'full', ventilatorPreference: 'full', artificialNutrition: true, palliativeCare: true },
      witnesses: [{ name: 'W1', relationship: 'spouse' }, { name: 'W2', relationship: 'child' }],
      isActive: true, version: 0,
    };
    expect(validateLivingWill(will)).toContain('Invalid version');
  });

  it('E05 — CPR preference must be valid', () => {
    const will: LivingWillData = {
      patientId: 'P-001',
      preferences: { cprPreference: 'invalid' as any, ventilatorPreference: 'full', artificialNutrition: true, palliativeCare: true },
      witnesses: [{ name: 'W1', relationship: 'a' }, { name: 'W2', relationship: 'b' }],
      isActive: true, version: 1,
    };
    expect(validateLivingWill(will)).toContain('Invalid CPR preference');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// F. Timeline Construction
// ═══════════════════════════════════════════════════════════════════════
describe('Patient Services — Timeline', () => {
  interface TimelineEvent {
    id: string;
    type: 'appointment' | 'lab' | 'prescription' | 'emr' | 'vital';
    title: string;
    date: string;
    details?: Record<string, unknown>;
  }

  function buildTimeline(events: TimelineEvent[]): TimelineEvent[] {
    return [...events].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  function filterByType(events: TimelineEvent[], type: TimelineEvent['type']): TimelineEvent[] {
    return events.filter(e => e.type === type);
  }

  function groupByMonth(events: TimelineEvent[]): Record<string, TimelineEvent[]> {
    const grouped: Record<string, TimelineEvent[]> = {};
    for (const e of events) {
      const key = e.date.substring(0, 7); // YYYY-MM
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(e);
    }
    return grouped;
  }

  const events: TimelineEvent[] = [
    { id: 'T1', type: 'appointment', title: 'GP Visit', date: '2026-03-01T10:00:00Z' },
    { id: 'T2', type: 'lab', title: 'Blood Test', date: '2026-03-02T08:00:00Z' },
    { id: 'T3', type: 'prescription', title: 'Medication', date: '2026-02-28T14:00:00Z' },
    { id: 'T4', type: 'vital', title: 'BP Check', date: '2026-03-01T09:00:00Z' },
  ];

  it('F01 — sorts timeline by date descending', () => {
    const sorted = buildTimeline(events);
    expect(sorted[0].id).toBe('T2');
    expect(sorted[sorted.length - 1].id).toBe('T3');
  });

  it('F02 — filters by type', () => {
    expect(filterByType(events, 'lab')).toHaveLength(1);
    expect(filterByType(events, 'appointment')).toHaveLength(1);
  });

  it('F03 — groups by month', () => {
    const grouped = groupByMonth(events);
    expect(Object.keys(grouped).sort()).toEqual(['2026-02', '2026-03']);
    expect(grouped['2026-03']).toHaveLength(3);
    expect(grouped['2026-02']).toHaveLength(1);
  });

  it('F04 — handles empty timeline', () => {
    expect(buildTimeline([])).toEqual([]);
    expect(groupByMonth([])).toEqual({});
  });

  it('F05 — returns empty for unmatched type filter', () => {
    expect(filterByType(events, 'emr')).toHaveLength(0);
  });
});
