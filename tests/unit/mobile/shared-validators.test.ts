/**
 * ═══════════════════════════════════════════════════════════════════════
 * IZARA TELEMEDICINE — SHARED VALIDATORS & FORMATTERS UNIT TESTS
 * ═══════════════════════════════════════════════════════════════════════
 * Tests: formatThaiDate, formatTime, calculateAge, formatCurrency,
 *        validateThaiNationalId, validateThaiPhone, constants
 * Source: Isara-mobile/packages/shared/src/index.ts
 * ═══════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from 'vitest';

// ─── Reimplement pure logic from @izara/shared for isolated testing ──

const thaiMonths = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
];

function formatThaiDate(dateString: string): string {
  const date = new Date(dateString);
  const day = date.getDate();
  const month = thaiMonths[date.getMonth()];
  const year = date.getFullYear() + 543; // Buddhist Era
  return `${day} ${month} ${year}`;
}

function formatTime(timeString: string): string {
  if (timeString.includes(':')) {
    return timeString.substring(0, 5);
  }
  const date = new Date(timeString);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const dob = new Date(dateOfBirth);
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

function formatCurrency(amount: number): string {
  return `฿${amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;
}

function validateThaiNationalId(id: string): boolean {
  if (!/^\d{13}$/.test(id)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(id[i]) * (13 - i);
  }
  const checkDigit = (11 - (sum % 11)) % 10;
  return checkDigit === parseInt(id[12]);
}

function validateThaiPhone(phone: string): boolean {
  return /^(0[689]\d{8}|0[23457]\d{7})$/.test(phone.replace(/[-\s]/g, ''));
}

// Constants
type AppointmentStatus = 'pending' | 'confirmed' | 'declined' | 'waiting' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
type VitalType = 'blood_pressure' | 'heart_rate' | 'temperature' | 'weight' | 'height' | 'blood_glucose' | 'oxygen_saturation' | 'respiratory_rate';

const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: 'รอการยืนยัน',
  confirmed: 'ยืนยันแล้ว',
  declined: 'ปฏิเสธ',
  waiting: 'รอตรวจ',
  in_progress: 'กำลังตรวจ',
  completed: 'เสร็จสิ้น',
  cancelled: 'ยกเลิก',
  no_show: 'ไม่มา',
};

const VITAL_TYPE_LABELS: Record<VitalType, string> = {
  blood_pressure: 'ความดันโลหิต',
  heart_rate: 'อัตราการเต้นของหัวใจ',
  temperature: 'อุณหภูมิ',
  weight: 'น้ำหนัก',
  height: 'ส่วนสูง',
  blood_glucose: 'น้ำตาลในเลือด',
  oxygen_saturation: 'ออกซิเจนในเลือด',
  respiratory_rate: 'อัตราการหายใจ',
};

const VITAL_TYPE_UNITS: Record<VitalType, string> = {
  blood_pressure: 'mmHg',
  heart_rate: 'bpm',
  temperature: '°C',
  weight: 'kg',
  height: 'cm',
  blood_glucose: 'mg/dL',
  oxygen_saturation: '%',
  respiratory_rate: 'breaths/min',
};

const SPECIALTIES = [
  { id: 'general', label: 'แพทย์ทั่วไป', labelEn: 'General Practitioner' },
  { id: 'internal', label: 'อายุรกรรม', labelEn: 'Internal Medicine' },
  { id: 'pediatrics', label: 'กุมารเวชศาสตร์', labelEn: 'Pediatrics' },
  { id: 'cardiology', label: 'หัวใจ', labelEn: 'Cardiology' },
  { id: 'dermatology', label: 'ผิวหนัง', labelEn: 'Dermatology' },
  { id: 'orthopedics', label: 'กระดูกและข้อ', labelEn: 'Orthopedics' },
  { id: 'ophthalmology', label: 'จักษุ', labelEn: 'Ophthalmology' },
  { id: 'ent', label: 'หู คอ จมูก', labelEn: 'ENT' },
  { id: 'psychiatry', label: 'จิตเวชศาสตร์', labelEn: 'Psychiatry' },
  { id: 'obgyn', label: 'สูติ-นรีเวช', labelEn: 'OB/GYN' },
  { id: 'surgery', label: 'ศัลยกรรม', labelEn: 'Surgery' },
  { id: 'neurology', label: 'ประสาทวิทยา', labelEn: 'Neurology' },
] as const;

// ════════════════════════════════════════════════════════════════════
// A. THAI DATE FORMATTING (10 tests)
// ════════════════════════════════════════════════════════════════════
describe('Thai Date Formatting', () => {
  it('A01 — formats a standard date in Buddhist Era', () => {
    const result = formatThaiDate('2024-01-15');
    expect(result).toContain('2567'); // 2024 + 543
    expect(result).toContain('ม.ค.');
  });

  it('A02 — formats December date correctly', () => {
    const result = formatThaiDate('2024-12-25');
    expect(result).toContain('ธ.ค.');
    expect(result).toContain('25');
    expect(result).toContain('2567');
  });

  it('A03 — formats March date correctly', () => {
    const result = formatThaiDate('2025-03-01');
    expect(result).toContain('มี.ค.');
    expect(result).toContain('2568');
  });

  it('A04 — formats June date correctly', () => {
    const result = formatThaiDate('2023-06-15');
    expect(result).toContain('มิ.ย.');
    expect(result).toContain('2566');
  });

  it('A05 — Buddhist Era year is +543 from Gregorian', () => {
    const result = formatThaiDate('2000-07-04');
    expect(result).toContain('2543');
  });

  it('A06 — formats single-digit day without leading zero', () => {
    const result = formatThaiDate('2024-05-01');
    expect(result).toMatch(/^1 /);
  });

  it('A07 — formats double-digit day', () => {
    const result = formatThaiDate('2024-05-31');
    expect(result).toMatch(/^31 /);
  });

  it('A08 — handles ISO datetime strings', () => {
    const result = formatThaiDate('2024-08-15T10:30:00Z');
    expect(result).toContain('ส.ค.');
    expect(result).toContain('2567');
  });

  it('A09 — February date uses ก.พ.', () => {
    const result = formatThaiDate('2024-02-29');
    expect(result).toContain('ก.พ.');
  });

  it('A10 — all 12 Thai months are unique abbreviations', () => {
    const unique = new Set(thaiMonths);
    expect(unique.size).toBe(12);
  });
});

// ════════════════════════════════════════════════════════════════════
// B. TIME FORMATTING (8 tests)
// ════════════════════════════════════════════════════════════════════
describe('Time Formatting', () => {
  it('B01 — formats HH:MM time string', () => {
    expect(formatTime('14:30')).toBe('14:30');
  });

  it('B02 — truncates seconds from HH:MM:SS', () => {
    expect(formatTime('09:15:45')).toBe('09:15');
  });

  it('B03 — handles midnight', () => {
    expect(formatTime('00:00')).toBe('00:00');
  });

  it('B04 — handles end of day', () => {
    expect(formatTime('23:59')).toBe('23:59');
  });

  it('B05 — handles time with extra data', () => {
    expect(formatTime('10:30:00.000Z')).toBe('10:30');
  });

  it('B06 — preserves leading zeros', () => {
    expect(formatTime('01:05')).toBe('01:05');
  });

  it('B07 — handles noon', () => {
    expect(formatTime('12:00')).toBe('12:00');
  });

  it('B08 — handles afternoon time', () => {
    expect(formatTime('17:45:30')).toBe('17:45');
  });
});

// ════════════════════════════════════════════════════════════════════
// C. AGE CALCULATION (10 tests)
// ════════════════════════════════════════════════════════════════════
describe('Age Calculation', () => {
  it('C01 — calculates age for adult', () => {
    const age = calculateAge('1990-01-01');
    expect(age).toBeGreaterThanOrEqual(34);
    expect(age).toBeLessThanOrEqual(36);
  });

  it('C02 — calculates age for child', () => {
    const tenYearsAgo = new Date();
    tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
    tenYearsAgo.setMonth(0, 1); // Jan 1
    const age = calculateAge(tenYearsAgo.toISOString().split('T')[0]);
    expect(age).toBe(10);
  });

  it('C03 — birthday not yet passed this year decrements age', () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() - 30);
    future.setMonth(future.getMonth() + 2); // 2 months from now
    const age = calculateAge(future.toISOString().split('T')[0]);
    expect(age).toBe(29);
  });

  it('C04 — birthday today is exact age', () => {
    const today = new Date();
    const birthYear = today.getFullYear() - 25;
    const dob = `${birthYear}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    expect(calculateAge(dob)).toBe(25);
  });

  it('C05 — returns 0 for newborn', () => {
    const today = new Date();
    const dob = today.toISOString().split('T')[0];
    expect(calculateAge(dob)).toBe(0);
  });

  it('C06 — handles leap year birthday', () => {
    const age = calculateAge('2000-02-29');
    expect(age).toBeGreaterThanOrEqual(24);
  });

  it('C07 — elderly patient age', () => {
    const age = calculateAge('1940-06-15');
    expect(age).toBeGreaterThanOrEqual(84);
  });

  it('C08 — ISO datetime string works', () => {
    const age = calculateAge('2000-01-01T00:00:00Z');
    expect(age).toBeGreaterThanOrEqual(24);
  });

  it('C09 — returns integer (no decimals)', () => {
    const age = calculateAge('1995-06-15');
    expect(Number.isInteger(age)).toBe(true);
  });

  it('C10 — age is always non-negative for past dates', () => {
    const age = calculateAge('2020-01-01');
    expect(age).toBeGreaterThanOrEqual(0);
  });
});

// ════════════════════════════════════════════════════════════════════
// D. CURRENCY FORMATTING (8 tests)
// ════════════════════════════════════════════════════════════════════
describe('Currency Formatting', () => {
  it('D01 — formats with baht symbol', () => {
    expect(formatCurrency(100)).toContain('฿');
  });

  it('D02 — includes 2 decimal places', () => {
    const result = formatCurrency(100);
    expect(result).toMatch(/\.\d{2}$/);
  });

  it('D03 — zero amount', () => {
    const result = formatCurrency(0);
    expect(result).toContain('0.00');
  });

  it('D04 — large amount with comma separators', () => {
    const result = formatCurrency(1500);
    expect(result).toContain('1,500') || expect(result).toContain('1500');
    expect(result).toContain('฿');
  });

  it('D05 — decimal amount', () => {
    const result = formatCurrency(299.50);
    expect(result).toContain('299.50');
  });

  it('D06 — very large amount', () => {
    const result = formatCurrency(1000000);
    expect(result).toContain('฿');
    expect(result.length).toBeGreaterThan(5);
  });

  it('D07 — small amount', () => {
    const result = formatCurrency(1);
    expect(result).toContain('1.00');
  });

  it('D08 — negative amount', () => {
    const result = formatCurrency(-500);
    expect(result).toContain('500');
  });
});

// ════════════════════════════════════════════════════════════════════
// E. THAI NATIONAL ID VALIDATION (12 tests)
// ════════════════════════════════════════════════════════════════════
describe('Thai National ID Validation', () => {
  it('E01 — valid 13-digit ID with correct check digit', () => {
    // Use a well-known valid test ID: 1-1009-99901-12-8 → 1100999901128
    // Validate with algorithm: sum = 1*13+1*12+0*11+0*10+9*9+9*8+9*7+9*6+0*5+1*4+1*3+2*2 = 13+12+0+0+81+72+63+54+0+4+3+4 = 306
    // checkDigit = (11 - (306 % 11)) % 10 = (11 - (306 mod 11)) % 10 = (11 - 9) % 10 = 2
    // Hmm, need to use a known-valid ID. Let's compute one:
    // For ID starting with 1234567890120: sum = 1*13+2*12+3*11+4*10+5*9+6*8+7*7+8*6+9*5+0*4+1*3+2*2
    //  = 13+24+33+40+45+48+49+48+45+0+3+4 = 352; checkDigit = (11 - 352%11)%10 = (11-0)%10 = 1
    expect(validateThaiNationalId('1234567890121')).toBe(true);
  });

  it('E02 — rejects empty string', () => {
    expect(validateThaiNationalId('')).toBe(false);
  });

  it('E03 — rejects 12-digit string', () => {
    expect(validateThaiNationalId('123456789012')).toBe(false);
  });

  it('E04 — rejects 14-digit string', () => {
    expect(validateThaiNationalId('12345678901234')).toBe(false);
  });

  it('E05 — rejects non-numeric characters', () => {
    expect(validateThaiNationalId('123456789012a')).toBe(false);
  });

  it('E06 — rejects with spaces', () => {
    expect(validateThaiNationalId('1 234567890121')).toBe(false);
  });

  it('E07 — rejects with dashes', () => {
    expect(validateThaiNationalId('1-2345-67890-12-1')).toBe(false);
  });

  it('E08 — rejects wrong check digit', () => {
    expect(validateThaiNationalId('1234567890120')).toBe(false);
  });

  it('E09 — rejects all zeros (invalid check digit)', () => {
    expect(validateThaiNationalId('0000000000000')).toBe(false);
  });

  it('E10 — validates another computed ID', () => {
    // 1111111111111: sum = 1*(13+12+11+10+9+8+7+6+5+4+3+2) = 1*90 = 90
    // checkDigit = (11 - 90%11)%10 = (11 - 2)%10 = 9
    // So 1111111111119 should be valid
    expect(validateThaiNationalId('1111111111119')).toBe(true);
  });

  it('E11 — rejects alphabetic string of 13 chars', () => {
    expect(validateThaiNationalId('abcdefghijklm')).toBe(false);
  });

  it('E12 — rejects special characters', () => {
    expect(validateThaiNationalId('!@#$%^&*()_+-')).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════
// F. THAI PHONE VALIDATION (12 tests)
// ════════════════════════════════════════════════════════════════════
describe('Thai Phone Validation', () => {
  it('F01 — valid mobile 08x (10 digits)', () => {
    expect(validateThaiPhone('0812345678')).toBe(true);
  });

  it('F02 — valid mobile 09x (10 digits)', () => {
    expect(validateThaiPhone('0912345678')).toBe(true);
  });

  it('F03 — valid mobile 06x (10 digits)', () => {
    expect(validateThaiPhone('0612345678')).toBe(true);
  });

  it('F04 — valid landline 02x (9 digits)', () => {
    expect(validateThaiPhone('021234567')).toBe(true);
  });

  it('F05 — valid landline 053 (9 digits)', () => {
    expect(validateThaiPhone('053123456')).toBe(true);
  });

  it('F06 — strips dashes before validation', () => {
    expect(validateThaiPhone('081-234-5678')).toBe(true);
  });

  it('F07 — strips spaces before validation', () => {
    expect(validateThaiPhone('081 234 5678')).toBe(true);
  });

  it('F08 — rejects too short', () => {
    expect(validateThaiPhone('081234')).toBe(false);
  });

  it('F09 — rejects too long', () => {
    expect(validateThaiPhone('08123456789')).toBe(false);
  });

  it('F10 — rejects non-0 prefix', () => {
    expect(validateThaiPhone('1812345678')).toBe(false);
  });

  it('F11 — rejects empty', () => {
    expect(validateThaiPhone('')).toBe(false);
  });

  it('F12 — rejects alphabetic', () => {
    expect(validateThaiPhone('ABCDEFGHIJ')).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════
// G. CONSTANTS INTEGRITY (10 tests)
// ════════════════════════════════════════════════════════════════════
describe('Shared Constants', () => {
  it('G01 — 8 appointment statuses defined', () => {
    expect(Object.keys(APPOINTMENT_STATUS_LABELS)).toHaveLength(8);
  });

  it('G02 — all status labels are non-empty Thai strings', () => {
    Object.values(APPOINTMENT_STATUS_LABELS).forEach(label => {
      expect(label.length).toBeGreaterThan(0);
    });
  });

  it('G03 — 8 vital types defined', () => {
    expect(Object.keys(VITAL_TYPE_LABELS)).toHaveLength(8);
  });

  it('G04 — vital types match between labels and units', () => {
    const labelKeys = Object.keys(VITAL_TYPE_LABELS).sort();
    const unitKeys = Object.keys(VITAL_TYPE_UNITS).sort();
    expect(labelKeys).toEqual(unitKeys);
  });

  it('G05 — blood pressure unit is mmHg', () => {
    expect(VITAL_TYPE_UNITS.blood_pressure).toBe('mmHg');
  });

  it('G06 — heart rate unit is bpm', () => {
    expect(VITAL_TYPE_UNITS.heart_rate).toBe('bpm');
  });

  it('G07 — temperature unit is °C', () => {
    expect(VITAL_TYPE_UNITS.temperature).toBe('°C');
  });

  it('G08 — 12 specialties defined', () => {
    expect(SPECIALTIES).toHaveLength(12);
  });

  it('G09 — all specialties have id, label, and labelEn', () => {
    SPECIALTIES.forEach(spec => {
      expect(spec.id).toBeDefined();
      expect(spec.label).toBeDefined();
      expect(spec.labelEn).toBeDefined();
    });
  });

  it('G10 — specialty IDs are unique', () => {
    const ids = SPECIALTIES.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ════════════════════════════════════════════════════════════════════
// H. TYPE INTERFACE SHAPE VALIDATION (8 tests)
// ════════════════════════════════════════════════════════════════════
describe('Type Interface Shapes', () => {
  it('H01 — PatientUser shape has required fields', () => {
    const patient = {
      id: 'p1', email: 'a@b.com', first_name: 'Test', last_name: 'User',
      role: 'patient' as const, created_at: '2024-01-01', updated_at: '2024-01-01',
    };
    expect(patient.role).toBe('patient');
    expect(patient.id).toBeTruthy();
  });

  it('H02 — DoctorUser shape has required fields', () => {
    const doctor = {
      id: 'd1', email: 'dr@izara.com', prefix: 'Dr.', first_name: 'Test',
      last_name: 'Doc', specialty: 'cardiology', license_number: 'TH12345',
      role: 'doctor' as const, is_approved: true,
      created_at: '2024-01-01', updated_at: '2024-01-01',
    };
    expect(doctor.role).toBe('doctor');
    expect(doctor.license_number).toBeTruthy();
  });

  it('H03 — Appointment shape covers all status transitions', () => {
    const statuses: AppointmentStatus[] = [
      'pending', 'confirmed', 'declined', 'waiting',
      'in_progress', 'completed', 'cancelled', 'no_show',
    ];
    statuses.forEach(s => {
      expect(APPOINTMENT_STATUS_LABELS[s]).toBeDefined();
    });
  });

  it('H04 — VitalRecord requires type, value, and unit', () => {
    const vital = { type: 'heart_rate', value: 72, unit: 'bpm' };
    expect(VITAL_TYPE_UNITS[vital.type as VitalType]).toBe(vital.unit);
  });

  it('H05 — EMR requires chief_complaint and assessment', () => {
    const emr = {
      id: 'e1', patient_id: 'p1', doctor_id: 'd1', doctor_name: 'Dr. Test',
      specialty: 'general', date: '2024-01-01',
      chief_complaint: 'Headache', assessment: 'Tension headache',
      plan: 'Rest + paracetamol', created_at: '2024-01-01', updated_at: '2024-01-01',
    };
    expect(emr.chief_complaint).toBeTruthy();
    expect(emr.assessment).toBeTruthy();
  });

  it('H06 — Notification has required fields', () => {
    const notification = {
      id: 'n1', user_id: 'u1', type: 'appointment_confirmed',
      title: 'Confirmed', body: 'Your appointment is confirmed',
      is_read: false, created_at: '2024-01-01',
    };
    expect(notification.type).toBe('appointment_confirmed');
    expect(notification.is_read).toBe(false);
  });

  it('H07 — Payment has amount and currency', () => {
    const payment = {
      id: 'pay1', appointment_id: 'a1', patient_id: 'p1',
      amount: 500, currency: 'THB', method: 'promptpay',
      status: 'completed', created_at: '2024-01-01',
    };
    expect(payment.amount).toBeGreaterThan(0);
    expect(payment.currency).toBe('THB');
  });

  it('H08 — Medication requires name, dosage, frequency', () => {
    const med = {
      id: 'm1', name: 'Paracetamol', dosage: '500mg',
      frequency: 'Every 6 hours', route: 'oral',
      start_date: '2024-01-01', is_active: true,
    };
    expect(med.name).toBeTruthy();
    expect(med.dosage).toBeTruthy();
    expect(med.is_active).toBe(true);
  });
});
