/**
 * ═══════════════════════════════════════════════════════════════════════
 * IZARA TELEMEDICINE — Data Validation & Transform Unit Tests
 * ═══════════════════════════════════════════════════════════════════════
 * Tests: Cross-portal data transforms, PHR ↔ EMR consistency,
 * appointment status transitions, notification payload validation,
 * settings serialization, map/geo data validation.
 * ═══════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from 'vitest';

// ═══════════════════════════════════════════════════════════════════════
// A. Appointment Status State Machine
// ═══════════════════════════════════════════════════════════════════════
describe('Data Validation — Appointment Status', () => {
  type AppointmentStatus = 'pending' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'no-show' | 'rescheduled';

  function canTransition(from: AppointmentStatus, to: AppointmentStatus): boolean {
    const allowed: Record<AppointmentStatus, AppointmentStatus[]> = {
      'pending': ['confirmed', 'cancelled', 'rescheduled'],
      'confirmed': ['in-progress', 'cancelled', 'no-show', 'rescheduled'],
      'in-progress': ['completed'],
      'completed': [],
      'cancelled': [],
      'no-show': ['rescheduled'],
      'rescheduled': ['pending', 'confirmed', 'cancelled'],
    };
    return allowed[from]?.includes(to) ?? false;
  }

  it('A01 — pending can be confirmed', () => {
    expect(canTransition('pending', 'confirmed')).toBe(true);
  });

  it('A02 — pending can be cancelled', () => {
    expect(canTransition('pending', 'cancelled')).toBe(true);
  });

  it('A03 — confirmed can start (in-progress)', () => {
    expect(canTransition('confirmed', 'in-progress')).toBe(true);
  });

  it('A04 — completed cannot transition', () => {
    expect(canTransition('completed', 'pending')).toBe(false);
    expect(canTransition('completed', 'cancelled')).toBe(false);
  });

  it('A05 — confirmed can become no-show', () => {
    expect(canTransition('confirmed', 'no-show')).toBe(true);
  });

  it('A06 — no-show can be rescheduled', () => {
    expect(canTransition('no-show', 'rescheduled')).toBe(true);
  });

  it('A07 — pending cannot skip to completed', () => {
    expect(canTransition('pending', 'completed')).toBe(false);
  });

  it('A08 — rescheduled returns to pending', () => {
    expect(canTransition('rescheduled', 'pending')).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// B. PHR ↔ EMR Data Consistency
// ═══════════════════════════════════════════════════════════════════════
describe('Data Validation — PHR/EMR Consistency', () => {
  interface PHRRecord {
    patientId: string;
    allergies: { allergen: string; severity: string }[];
    medications: { name: string; dosage: string }[];
    conditions: { condition: string; status: string }[];
  }

  interface EMRRecord {
    doctorId: string;
    patientId: string;
    diagnosis: string[];
    prescriptions: { medication: string; dosage: string }[];
    allergiesReviewed: string[];
  }

  function crossValidate(phr: PHRRecord, emr: EMRRecord): string[] {
    const warnings: string[] = [];
    // Check patient ID match
    if (phr.patientId !== emr.patientId) warnings.push('Patient ID mismatch');

    // Check allergy review
    const unreviewedAllergies = phr.allergies.filter(a => !emr.allergiesReviewed.includes(a.allergen));
    if (unreviewedAllergies.length > 0) {
      warnings.push(`${unreviewedAllergies.length} allergies not reviewed in EMR`);
    }

    // Check prescription-allergy conflicts
    for (const rx of emr.prescriptions) {
      for (const allergy of phr.allergies) {
        if (rx.medication.toLowerCase().includes(allergy.allergen.toLowerCase())) {
          warnings.push(`Prescription ${rx.medication} conflicts with allergy to ${allergy.allergen}`);
        }
      }
    }

    return warnings;
  }

  it('B01 — no warnings for consistent data', () => {
    const phr: PHRRecord = {
      patientId: 'P-1', allergies: [{ allergen: 'Penicillin', severity: 'high' }],
      medications: [], conditions: [],
    };
    const emr: EMRRecord = {
      doctorId: 'D-1', patientId: 'P-1', diagnosis: ['R51'],
      prescriptions: [{ medication: 'Paracetamol', dosage: '500mg' }],
      allergiesReviewed: ['Penicillin'],
    };
    expect(crossValidate(phr, emr)).toHaveLength(0);
  });

  it('B02 — warns on unreviewed allergies', () => {
    const phr: PHRRecord = {
      patientId: 'P-1', allergies: [{ allergen: 'Penicillin', severity: 'high' }, { allergen: 'Sulfa', severity: 'moderate' }],
      medications: [], conditions: [],
    };
    const emr: EMRRecord = {
      doctorId: 'D-1', patientId: 'P-1', diagnosis: [],
      prescriptions: [], allergiesReviewed: ['Penicillin'],
    };
    const warnings = crossValidate(phr, emr);
    expect(warnings.some(w => w.includes('not reviewed'))).toBe(true);
  });

  it('B03 — warns on patient ID mismatch', () => {
    const phr: PHRRecord = { patientId: 'P-1', allergies: [], medications: [], conditions: [] };
    const emr: EMRRecord = { doctorId: 'D-1', patientId: 'P-2', diagnosis: [], prescriptions: [], allergiesReviewed: [] };
    expect(crossValidate(phr, emr)).toContain('Patient ID mismatch');
  });

  it('B04 — detects prescription-allergy conflict', () => {
    const phr: PHRRecord = {
      patientId: 'P-1', allergies: [{ allergen: 'Penicillin', severity: 'high' }],
      medications: [], conditions: [],
    };
    const emr: EMRRecord = {
      doctorId: 'D-1', patientId: 'P-1', diagnosis: [],
      prescriptions: [{ medication: 'Penicillin V', dosage: '250mg' }],
      allergiesReviewed: ['Penicillin'],
    };
    const warnings = crossValidate(phr, emr);
    expect(warnings.some(w => w.includes('conflicts with allergy'))).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// C. Notification Payload Validation
// ═══════════════════════════════════════════════════════════════════════
describe('Data Validation — Notification Payloads', () => {
  interface NotificationPayload {
    type: 'appointment' | 'emr' | 'lab' | 'prescription' | 'system' | 'reminder';
    title: string;
    message: string;
    targetUserId: string;
    data?: Record<string, unknown>;
    priority: 'low' | 'normal' | 'high' | 'urgent';
  }

  function validateNotification(payload: NotificationPayload): string[] {
    const errors: string[] = [];
    if (!['appointment', 'emr', 'lab', 'prescription', 'system', 'reminder'].includes(payload.type)) {
      errors.push('Invalid notification type');
    }
    if (!payload.title || payload.title.length < 2) errors.push('Title required');
    if (!payload.message || payload.message.length < 5) errors.push('Message too short');
    if (!payload.targetUserId) errors.push('Target user required');
    if (!['low', 'normal', 'high', 'urgent'].includes(payload.priority)) errors.push('Invalid priority');
    return errors;
  }

  it('C01 — valid notification passes', () => {
    const payload: NotificationPayload = {
      type: 'appointment', title: 'New Appointment',
      message: 'Your appointment has been confirmed',
      targetUserId: 'PATIENT-DEMO', priority: 'normal',
    };
    expect(validateNotification(payload)).toHaveLength(0);
  });

  it('C02 — rejects invalid type', () => {
    const payload: NotificationPayload = {
      type: 'invalid' as any, title: 'Test', message: 'Test message',
      targetUserId: 'P-1', priority: 'normal',
    };
    expect(validateNotification(payload)).toContain('Invalid notification type');
  });

  it('C03 — rejects short message', () => {
    const payload: NotificationPayload = {
      type: 'system', title: 'Test', message: 'Hi',
      targetUserId: 'P-1', priority: 'normal',
    };
    expect(validateNotification(payload)).toContain('Message too short');
  });

  it('C04 — all notification types are valid', () => {
    for (const type of ['appointment', 'emr', 'lab', 'prescription', 'system', 'reminder'] as const) {
      const payload: NotificationPayload = {
        type, title: 'Test Notif', message: 'This is a test notification',
        targetUserId: 'P-1', priority: 'normal',
      };
      expect(validateNotification(payload)).toHaveLength(0);
    }
  });

  it('C05 — all priority levels are valid', () => {
    for (const priority of ['low', 'normal', 'high', 'urgent'] as const) {
      const payload: NotificationPayload = {
        type: 'system', title: 'Test', message: 'Test message text',
        targetUserId: 'P-1', priority,
      };
      expect(validateNotification(payload)).toHaveLength(0);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// D. Settings Serialization
// ═══════════════════════════════════════════════════════════════════════
describe('Data Validation — Settings', () => {
  interface UserSettings {
    theme: 'light' | 'dark' | 'system';
    language: 'th' | 'en';
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
      appointmentReminder: boolean;
      labResults: boolean;
    };
    accessibility: {
      fontSize: 'small' | 'medium' | 'large';
      highContrast: boolean;
    };
  }

  function getDefaultSettings(): UserSettings {
    return {
      theme: 'light',
      language: 'th',
      notifications: { email: true, push: true, sms: false, appointmentReminder: true, labResults: true },
      accessibility: { fontSize: 'medium', highContrast: false },
    };
  }

  function mergeSettings(current: UserSettings, partial: Partial<UserSettings>): UserSettings {
    return {
      ...current,
      ...partial,
      notifications: { ...current.notifications, ...partial.notifications },
      accessibility: { ...current.accessibility, ...partial.accessibility },
    };
  }

  it('D01 — default settings are valid', () => {
    const settings = getDefaultSettings();
    expect(settings.theme).toBe('light');
    expect(settings.language).toBe('th');
    expect(settings.notifications.email).toBe(true);
    expect(settings.accessibility.fontSize).toBe('medium');
  });

  it('D02 — merge preserves existing values', () => {
    const current = getDefaultSettings();
    const merged = mergeSettings(current, { theme: 'dark' });
    expect(merged.theme).toBe('dark');
    expect(merged.language).toBe('th'); // preserved
    expect(merged.notifications.email).toBe(true); // preserved
  });

  it('D03 — merge updates nested notifications', () => {
    const current = getDefaultSettings();
    const merged = mergeSettings(current, { notifications: { ...current.notifications, sms: true } });
    expect(merged.notifications.sms).toBe(true);
    expect(merged.notifications.email).toBe(true);
  });

  it('D04 — serialization round-trip preserves data', () => {
    const settings = getDefaultSettings();
    const json = JSON.stringify(settings);
    const parsed = JSON.parse(json) as UserSettings;
    expect(parsed).toEqual(settings);
  });

  it('D05 — default language is Thai', () => {
    expect(getDefaultSettings().language).toBe('th');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// E. Map / Geo Validation
// ═══════════════════════════════════════════════════════════════════════
describe('Data Validation — Map & Geo', () => {
  interface GeoLocation {
    latitude: number;
    longitude: number;
  }

  function isValidCoordinate(lat: number, lng: number): boolean {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }

  function calculateDistance(a: GeoLocation, b: GeoLocation): number {
    const R = 6371; // Earth radius in km
    const dLat = (b.latitude - a.latitude) * Math.PI / 180;
    const dLng = (b.longitude - a.longitude) * Math.PI / 180;
    const lat1 = a.latitude * Math.PI / 180;
    const lat2 = b.latitude * Math.PI / 180;
    const x = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  }

  function isInBangkok(coord: GeoLocation): boolean {
    // Rough Bangkok bounding box
    return coord.latitude >= 13.5 && coord.latitude <= 14.0 &&
           coord.longitude >= 100.3 && coord.longitude <= 100.9;
  }

  it('E01 — validates Bangkok coordinates', () => {
    expect(isValidCoordinate(13.7563, 100.5018)).toBe(true);
  });

  it('E02 — rejects invalid latitude', () => {
    expect(isValidCoordinate(95, 100)).toBe(false);
  });

  it('E03 — rejects invalid longitude', () => {
    expect(isValidCoordinate(13, 200)).toBe(false);
  });

  it('E04 — calculates distance between Bangkok locations', () => {
    // ~10 km between central Bangkok and Chatuchak
    const central: GeoLocation = { latitude: 13.7463, longitude: 100.5018 };
    const chatuchak: GeoLocation = { latitude: 13.7999, longitude: 100.5533 };
    const dist = calculateDistance(central, chatuchak);
    expect(dist).toBeGreaterThan(5);
    expect(dist).toBeLessThan(15);
  });

  it('E05 — zero distance for same location', () => {
    const loc: GeoLocation = { latitude: 13.7563, longitude: 100.5018 };
    expect(calculateDistance(loc, loc)).toBe(0);
  });

  it('E06 — Bangkok coordinates are in Bangkok', () => {
    expect(isInBangkok({ latitude: 13.7563, longitude: 100.5018 })).toBe(true);
  });

  it('E07 — Chiang Mai is not in Bangkok', () => {
    expect(isInBangkok({ latitude: 18.7883, longitude: 98.9853 })).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// F. Phase 2 Feature Data Validation
// ═══════════════════════════════════════════════════════════════════════
describe('Data Validation — Phase 2 Features', () => {
  interface CTMAssessment {
    patientId: string;
    dhatu: 'ปิตตะ' | 'วาตะ' | 'เสมหะ' | 'สันนิปาตะ';
    samutthan: string;
    herbalPrescription?: { formulaName: string; herbs: { name: string; amount: string }[] };
  }

  interface GeriatricScreening {
    patientId: string;
    adlScore: number;
    iadlScore: number;
    miniCogScore: number;
    fallRisk: 'low' | 'moderate' | 'high';
  }

  interface SOSAlert {
    patientId: string;
    type: 'emergency' | 'urgent' | 'routine';
    location: GeoLocation;
    message: string;
  }

  interface GeoLocation { latitude: number; longitude: number; }

  function validateCTM(ctm: CTMAssessment): string[] {
    const errors: string[] = [];
    if (!ctm.patientId) errors.push('Patient ID required');
    if (!['ปิตตะ', 'วาตะ', 'เสมหะ', 'สันนิปาตะ'].includes(ctm.dhatu)) errors.push('Invalid dhatu');
    if (!ctm.samutthan) errors.push('Samutthan required');
    return errors;
  }

  function assessFallRisk(tugSeconds: number): 'low' | 'moderate' | 'high' {
    if (tugSeconds < 10) return 'low';
    if (tugSeconds < 20) return 'moderate';
    return 'high';
  }

  function validateSOSAlert(sos: SOSAlert): string[] {
    const errors: string[] = [];
    if (!sos.patientId) errors.push('Patient ID required');
    if (!['emergency', 'urgent', 'routine'].includes(sos.type)) errors.push('Invalid SOS type');
    if (!sos.location || sos.location.latitude === 0 && sos.location.longitude === 0) errors.push('Invalid location');
    if (!sos.message) errors.push('Message required');
    return errors;
  }

  it('F01 — valid CTM assessment passes', () => {
    const ctm: CTMAssessment = { patientId: 'P-1', dhatu: 'ปิตตะ', samutthan: 'อุตุสมุฏฐาน' };
    expect(validateCTM(ctm)).toHaveLength(0);
  });

  it('F02 — all Thai dhatu types are valid', () => {
    for (const dhatu of ['ปิตตะ', 'วาตะ', 'เสมหะ', 'สันนิปาตะ'] as const) {
      expect(validateCTM({ patientId: 'P-1', dhatu, samutthan: 'test' })).toHaveLength(0);
    }
  });

  it('F03 — fall risk assessment by TUG test', () => {
    expect(assessFallRisk(8)).toBe('low');
    expect(assessFallRisk(15)).toBe('moderate');
    expect(assessFallRisk(25)).toBe('high');
  });

  it('F04 — valid SOS alert passes', () => {
    const sos: SOSAlert = {
      patientId: 'P-1', type: 'emergency',
      location: { latitude: 13.7563, longitude: 100.5018 },
      message: 'ต้องการความช่วยเหลือ',
    };
    expect(validateSOSAlert(sos)).toHaveLength(0);
  });

  it('F05 — rejects SOS with invalid location', () => {
    const sos: SOSAlert = {
      patientId: 'P-1', type: 'emergency',
      location: { latitude: 0, longitude: 0 },
      message: 'Help',
    };
    expect(validateSOSAlert(sos)).toContain('Invalid location');
  });

  it('F06 — geriatric screening data structure', () => {
    const screening: GeriatricScreening = {
      patientId: 'P-1', adlScore: 16, iadlScore: 6, miniCogScore: 3, fallRisk: 'moderate',
    };
    expect(screening.adlScore).toBeGreaterThan(0);
    expect(['low', 'moderate', 'high']).toContain(screening.fallRisk);
  });
});
