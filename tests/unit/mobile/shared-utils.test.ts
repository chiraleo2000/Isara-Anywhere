/**
 * ═══════════════════════════════════════════════════════════════════════
 * IZARA TELEMEDICINE — MOBILE SHARED UTILS UNIT TESTS
 * ═══════════════════════════════════════════════════════════════════════
 * Tests: formatThaiDate, formatTime, calculateAge, formatCurrency,
 *        validateThaiNationalId, validateThaiPhone, constants
 * Source: Isara-mobile/packages/shared/src/index.ts
 * ═══════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from 'vitest';
import {
  formatThaiDate,
  formatTime,
  calculateAge,
  formatCurrency,
  validateThaiNationalId,
  validateThaiPhone,
  APPOINTMENT_STATUS_LABELS,
  VITAL_TYPE_LABELS,
  VITAL_TYPE_UNITS,
  SPECIALTIES,
} from '../../../Isara-mobile/packages/shared/src/index';

// ─────────────────────────────────────────────
// A. formatThaiDate
// ─────────────────────────────────────────────

describe('Mobile Shared — formatThaiDate', () => {
  it('A01 — formats date with Buddhist Era year (+543)', () => {
    const result = formatThaiDate('2026-01-15');
    expect(result).toContain('2569'); // 2026 + 543 = 2569
    expect(result).toContain('15');
    expect(result).toContain('ม.ค.');
  });

  it('A02 — formats February correctly', () => {
    const result = formatThaiDate('2026-02-22');
    expect(result).toContain('22');
    expect(result).toContain('ก.พ.');
    expect(result).toContain('2569');
  });

  it('A03 — formats December correctly', () => {
    const result = formatThaiDate('2025-12-31');
    expect(result).toContain('31');
    expect(result).toContain('ธ.ค.');
  });

  it('A04 — handles ISO string with time', () => {
    const result = formatThaiDate('2026-06-01T10:30:00Z');
    expect(result).toContain('มิ.ย.');
  });
});

// ─────────────────────────────────────────────
// B. formatTime
// ─────────────────────────────────────────────

describe('Mobile Shared — formatTime', () => {
  it('B01 — formats HH:MM:SS to HH:MM', () => {
    expect(formatTime('14:30:00')).toBe('14:30');
  });

  it('B02 — keeps HH:MM as-is', () => {
    expect(formatTime('09:15')).toBe('09:15');
  });

  it('B03 — formats ISO datetime to HH:MM', () => {
    // When input contains ":", it takes first 5 chars
    const result = formatTime('14:30:00.000Z');
    expect(result).toBe('14:30');
  });
});

// ─────────────────────────────────────────────
// C. calculateAge
// ─────────────────────────────────────────────

describe('Mobile Shared — calculateAge', () => {
  it('C01 — calculates correct age for past date', () => {
    const tenYearsAgo = new Date();
    tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
    tenYearsAgo.setMonth(0, 1); // January 1
    const age = calculateAge(tenYearsAgo.toISOString());
    expect(age).toBe(10);
  });

  it('C02 — returns 0 for DOB in current year (within same year)', () => {
    const today = new Date();
    const dob = new Date(today.getFullYear(), 0, 1); // Jan 1 this year
    const age = calculateAge(dob.toISOString());
    expect(age).toBe(0);
  });

  it('C03 — handles birthday not yet passed this year', () => {
    const today = new Date();
    // DOB: Dec 31, 30 years ago — birthday hasn't passed yet if we're before Dec 31
    const dob = new Date(today.getFullYear() - 30, 11, 31);
    const age = calculateAge(dob.toISOString());
    // If today is before Dec 31, age = 29; if today is Dec 31, age = 30
    expect(age).toBeGreaterThanOrEqual(29);
    expect(age).toBeLessThanOrEqual(30);
  });

  it('C04 — calculates age for specific known dates', () => {
    // Person born 1990-01-01, tested February 22, 2026 = 36 years old
    const age = calculateAge('1990-01-01');
    expect(age).toBeGreaterThanOrEqual(35);
    expect(age).toBeLessThanOrEqual(36);
  });
});

// ─────────────────────────────────────────────
// D. formatCurrency
// ─────────────────────────────────────────────

describe('Mobile Shared — formatCurrency', () => {
  it('D01 — formats with Thai Baht symbol', () => {
    const result = formatCurrency(1500);
    expect(result).toContain('฿');
    expect(result).toContain('1,500');
  });

  it('D02 — formats with 2 decimal places', () => {
    const result = formatCurrency(100);
    expect(result).toContain('.00');
  });

  it('D03 — formats zero', () => {
    const result = formatCurrency(0);
    expect(result).toContain('฿');
    expect(result).toContain('0');
  });

  it('D04 — formats large number with thousands separator', () => {
    const result = formatCurrency(1000000);
    expect(result).toContain('฿');
    expect(result).toContain('1,000,000');
  });
});

// ─────────────────────────────────────────────
// E. validateThaiNationalId
// ─────────────────────────────────────────────

describe('Mobile Shared — validateThaiNationalId', () => {
  it('E01 — rejects non-13-digit strings', () => {
    expect(validateThaiNationalId('123')).toBe(false);
    expect(validateThaiNationalId('12345678901234')).toBe(false);
    expect(validateThaiNationalId('abcdefghijklm')).toBe(false);
  });

  it('E02 — rejects strings with non-numeric chars', () => {
    expect(validateThaiNationalId('1234567890abc')).toBe(false);
  });

  it('E03 — validates check digit algorithm', () => {
    // Build a valid Thai national ID:
    // sum of digits[0..11] * (13-i), checkDigit = (11 - sum%11) % 10
    const base = '110099900000';
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(base[i]) * (13 - i);
    }
    const checkDigit = (11 - (sum % 11)) % 10;
    const validId = base + checkDigit;
    expect(validateThaiNationalId(validId)).toBe(true);
  });

  it('E04 — rejects ID with wrong check digit', () => {
    const base = '110099900000';
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(base[i]) * (13 - i);
    }
    const checkDigit = (11 - (sum % 11)) % 10;
    const wrongDigit = (checkDigit + 1) % 10;
    const invalidId = base + wrongDigit;
    expect(validateThaiNationalId(invalidId)).toBe(false);
  });
});

// ─────────────────────────────────────────────
// F. validateThaiPhone
// ─────────────────────────────────────────────

describe('Mobile Shared — validateThaiPhone', () => {
  it('F01 — validates mobile starting with 06', () => {
    expect(validateThaiPhone('0612345678')).toBe(true);
  });

  it('F02 — validates mobile starting with 08', () => {
    expect(validateThaiPhone('0891234567')).toBe(true);
  });

  it('F03 — validates mobile starting with 09', () => {
    expect(validateThaiPhone('0912345678')).toBe(true);
  });

  it('F04 — validates landline starting with 02', () => {
    expect(validateThaiPhone('021234567')).toBe(true);
  });

  it('F05 — rejects too short', () => {
    expect(validateThaiPhone('08912')).toBe(false);
  });

  it('F06 — rejects too long', () => {
    expect(validateThaiPhone('089123456789')).toBe(false);
  });

  it('F07 — handles dashes and spaces', () => {
    expect(validateThaiPhone('089-123-4567')).toBe(true);
    expect(validateThaiPhone('089 123 4567')).toBe(true);
  });
});

// ─────────────────────────────────────────────
// G. Constants
// ─────────────────────────────────────────────

describe('Mobile Shared — Constants', () => {
  it('G01 — APPOINTMENT_STATUS_LABELS has 8 statuses', () => {
    expect(Object.keys(APPOINTMENT_STATUS_LABELS)).toHaveLength(8);
    expect(APPOINTMENT_STATUS_LABELS.pending).toBe('รอการยืนยัน');
    expect(APPOINTMENT_STATUS_LABELS.completed).toBe('เสร็จสิ้น');
  });

  it('G02 — VITAL_TYPE_LABELS has 8 types', () => {
    expect(Object.keys(VITAL_TYPE_LABELS)).toHaveLength(8);
    expect(VITAL_TYPE_LABELS.blood_pressure).toBe('ความดันโลหิต');
  });

  it('G03 — VITAL_TYPE_UNITS has correct units', () => {
    expect(VITAL_TYPE_UNITS.blood_pressure).toBe('mmHg');
    expect(VITAL_TYPE_UNITS.heart_rate).toBe('bpm');
    expect(VITAL_TYPE_UNITS.temperature).toBe('°C');
    expect(VITAL_TYPE_UNITS.weight).toBe('kg');
  });

  it('G04 — SPECIALTIES has 12 entries', () => {
    expect(SPECIALTIES).toHaveLength(12);
  });

  it('G05 — each specialty has id, Thai label, and English label', () => {
    for (const spec of SPECIALTIES) {
      expect(spec.id).toBeTruthy();
      expect(spec.label).toBeTruthy();
      expect(spec.labelEn).toBeTruthy();
    }
  });

  it('G06 — specialties include General Practitioner', () => {
    const general = SPECIALTIES.find(s => s.id === 'general');
    expect(general).toBeDefined();
    expect(general!.labelEn).toBe('General Practitioner');
    expect(general!.label).toBe('แพทย์ทั่วไป');
  });
});
