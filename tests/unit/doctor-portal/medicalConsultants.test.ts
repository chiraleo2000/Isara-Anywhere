// ============================================================================
// Medical Consultants Workflow Tests — Doctor Portal
// Based on: Processes/Medical_Consultants_Workflows.md
// Tests: CRUD, rating, specialty filtering, availability, contact
// ============================================================================

import { describe, it, expect } from 'vitest';

// --- Types ---

interface Consultant {
  id: string;
  name: string;
  nameTh?: string;
  specialty: string;
  hospital: string;
  email: string;
  phone?: string;
  available: boolean;
  rating: number;
  reviewCount: number;
  notes?: string;
  createdBy: string;
}

interface Review {
  id: string;
  consultantId: string;
  doctorId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

// --- Constants ---

const SPECIALTIES = [
  'Cardiology', 'Dermatology', 'Endocrinology', 'Gastroenterology',
  'General Surgery', 'Hematology', 'Infectious Disease', 'Internal Medicine',
  'Nephrology', 'Neurology', 'Obstetrics', 'Oncology', 'Ophthalmology',
  'Orthopedics', 'Otolaryngology', 'Pediatrics', 'Psychiatry',
  'Pulmonology', 'Radiology', 'Urology'
];

const VALID_ROLES = ['doctor', 'admin'];

// --- Helper Functions ---

function validateConsultant(data: Partial<Consultant>): string[] {
  const errors: string[] = [];
  if (!data.name || data.name.trim().length === 0) errors.push('Name is required');
  if (!data.specialty) errors.push('Specialty is required');
  if (data.specialty && !SPECIALTIES.includes(data.specialty)) errors.push('Invalid specialty');
  if (!data.hospital) errors.push('Hospital is required');
  if (!data.email) errors.push('Email is required');
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.push('Invalid email format');
  return errors;
}

function canPerformAction(role: string, action: 'create' | 'read' | 'update' | 'delete' | 'rate' | 'contact' | 'toggle_availability'): boolean {
  if (role === 'admin') return true;
  if (role === 'doctor') return ['read', 'rate', 'contact'].includes(action);
  return false;
}

function generateConsultantId(): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `CONS-${ts}-${rand}`;
}

function calculateAverageRating(reviews: Review[]): number {
  if (reviews.length === 0) return 0;
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  return Math.round((sum / reviews.length) * 10) / 10;
}

function filterBySpecialty(consultants: Consultant[], specialty: string): Consultant[] {
  return consultants.filter(c => c.specialty === specialty);
}

function filterByAvailability(consultants: Consultant[], available: boolean): Consultant[] {
  return consultants.filter(c => c.available === available);
}

function searchConsultants(consultants: Consultant[], query: string): Consultant[] {
  const q = query.toLowerCase();
  return consultants.filter(c =>
    c.name.toLowerCase().includes(q) ||
    c.specialty.toLowerCase().includes(q) ||
    c.hospital.toLowerCase().includes(q) ||
    c.nameTh?.includes(q)
  );
}

function validateReview(review: Partial<Review>): string[] {
  const errors: string[] = [];
  if (!review.consultantId) errors.push('consultantId is required');
  if (!review.doctorId) errors.push('doctorId is required');
  if (review.rating === undefined || review.rating < 1 || review.rating > 5) errors.push('Rating must be 1-5');
  if (!Number.isInteger(review.rating)) errors.push('Rating must be integer');
  return errors;
}

function sortByRating(consultants: Consultant[], order: 'asc' | 'desc' = 'desc'): Consultant[] {
  return [...consultants].sort((a, b) => order === 'desc' ? b.rating - a.rating : a.rating - b.rating);
}

// --- Tests ---

describe('Medical Consultants Workflow (Process: Medical_Consultants_Workflows.md)', () => {

  describe('A — Consultant Validation', () => {
    it('A01 — valid consultant passes', () => {
      const errors = validateConsultant({
        name: 'Dr. Somchai', specialty: 'Cardiology',
        hospital: 'Bangkok Hospital', email: 'somchai@bkk.com',
      });
      expect(errors).toHaveLength(0);
    });

    it('A02 — missing name fails', () => {
      const errors = validateConsultant({ specialty: 'Cardiology', hospital: 'BKK', email: 'a@b.com' });
      expect(errors).toContain('Name is required');
    });

    it('A03 — invalid specialty fails', () => {
      const errors = validateConsultant({ name: 'Dr.X', specialty: 'Dentistry', hospital: 'BKK', email: 'a@b.com' });
      expect(errors).toContain('Invalid specialty');
    });

    it('A04 — invalid email fails', () => {
      const errors = validateConsultant({ name: 'Dr.X', specialty: 'Cardiology', hospital: 'BKK', email: 'notanemail' });
      expect(errors).toContain('Invalid email format');
    });

    it('A05 — all 20 specialties are valid', () => {
      expect(SPECIALTIES).toHaveLength(20);
      for (const spec of SPECIALTIES) {
        const errors = validateConsultant({ name: 'Dr.X', specialty: spec, hospital: 'BKK', email: 'a@b.com' });
        expect(errors).toHaveLength(0);
      }
    });
  });

  describe('B — Role-Based Access Control', () => {
    it('B01 — admin can create', () => expect(canPerformAction('admin', 'create')).toBe(true));
    it('B02 — admin can update', () => expect(canPerformAction('admin', 'update')).toBe(true));
    it('B03 — admin can delete', () => expect(canPerformAction('admin', 'delete')).toBe(true));
    it('B04 — admin can toggle availability', () => expect(canPerformAction('admin', 'toggle_availability')).toBe(true));
    it('B05 — doctor can read', () => expect(canPerformAction('doctor', 'read')).toBe(true));
    it('B06 — doctor can rate', () => expect(canPerformAction('doctor', 'rate')).toBe(true));
    it('B07 — doctor can contact', () => expect(canPerformAction('doctor', 'contact')).toBe(true));
    it('B08 — doctor cannot create', () => expect(canPerformAction('doctor', 'create')).toBe(false));
    it('B09 — doctor cannot delete', () => expect(canPerformAction('doctor', 'delete')).toBe(false));
    it('B10 — unknown role cannot do anything', () => {
      for (const action of ['create', 'read', 'update', 'delete', 'rate', 'contact', 'toggle_availability'] as const) {
        expect(canPerformAction('nurse', action)).toBe(false);
      }
    });
  });

  describe('C — ID Generation', () => {
    it('C01 — starts with CONS- prefix', () => expect(generateConsultantId()).toMatch(/^CONS-/));
    it('C02 — unique IDs', () => {
      const ids = new Set(Array.from({ length: 10 }, () => generateConsultantId()));
      expect(ids.size).toBe(10);
    });
  });

  describe('D — Rating Calculation', () => {
    it('D01 — empty reviews returns 0', () => expect(calculateAverageRating([])).toBe(0));
    it('D02 — single review returns that rating', () => {
      expect(calculateAverageRating([{ id: '1', consultantId: 'C1', doctorId: 'D1', rating: 4, comment: '', createdAt: '' }])).toBe(4);
    });
    it('D03 — multiple reviews averaged', () => {
      const reviews: Review[] = [
        { id: '1', consultantId: 'C1', doctorId: 'D1', rating: 5, comment: '', createdAt: '' },
        { id: '2', consultantId: 'C1', doctorId: 'D2', rating: 3, comment: '', createdAt: '' },
      ];
      expect(calculateAverageRating(reviews)).toBe(4);
    });
    it('D04 — rounded to 1 decimal', () => {
      const reviews: Review[] = [
        { id: '1', consultantId: 'C1', doctorId: 'D1', rating: 5, comment: '', createdAt: '' },
        { id: '2', consultantId: 'C1', doctorId: 'D2', rating: 4, comment: '', createdAt: '' },
        { id: '3', consultantId: 'C1', doctorId: 'D3', rating: 3, comment: '', createdAt: '' },
      ];
      expect(calculateAverageRating(reviews)).toBe(4);
    });
  });

  describe('E — Filtering', () => {
    const consultants: Consultant[] = [
      { id: '1', name: 'Dr. A', specialty: 'Cardiology', hospital: 'BKK', email: 'a@b.com', available: true, rating: 4.5, reviewCount: 10, createdBy: 'admin' },
      { id: '2', name: 'Dr. B', specialty: 'Neurology', hospital: 'Siriraj', email: 'b@b.com', available: false, rating: 3.8, reviewCount: 5, createdBy: 'admin' },
      { id: '3', name: 'Dr. C', nameTh: 'หมอ ค', specialty: 'Cardiology', hospital: 'BKK', email: 'c@b.com', available: true, rating: 4.2, reviewCount: 8, createdBy: 'admin' },
    ];

    it('E01 — filter by specialty', () => expect(filterBySpecialty(consultants, 'Cardiology')).toHaveLength(2));
    it('E02 — filter by availability', () => expect(filterByAvailability(consultants, true)).toHaveLength(2));
    it('E03 — search by name', () => expect(searchConsultants(consultants, 'Dr. A')).toHaveLength(1));
    it('E04 — search by hospital', () => expect(searchConsultants(consultants, 'siriraj')).toHaveLength(1));
    it('E05 — search by Thai name', () => expect(searchConsultants(consultants, 'หมอ ค')).toHaveLength(1));
    it('E06 — sort by rating desc', () => {
      const sorted = sortByRating(consultants, 'desc');
      expect(sorted[0].rating).toBe(4.5);
      expect(sorted[2].rating).toBe(3.8);
    });
    it('E07 — sort by rating asc', () => {
      const sorted = sortByRating(consultants, 'asc');
      expect(sorted[0].rating).toBe(3.8);
    });
  });

  describe('F — Review Validation', () => {
    it('F01 — valid review passes', () => {
      const errors = validateReview({ consultantId: 'C1', doctorId: 'D1', rating: 5 });
      expect(errors).toHaveLength(0);
    });
    it('F02 — rating below 1 fails', () => {
      const errors = validateReview({ consultantId: 'C1', doctorId: 'D1', rating: 0 });
      expect(errors).toContain('Rating must be 1-5');
    });
    it('F03 — rating above 5 fails', () => {
      const errors = validateReview({ consultantId: 'C1', doctorId: 'D1', rating: 6 });
      expect(errors).toContain('Rating must be 1-5');
    });
    it('F04 — decimal rating fails', () => {
      const errors = validateReview({ consultantId: 'C1', doctorId: 'D1', rating: 3.5 });
      expect(errors).toContain('Rating must be integer');
    });
    it('F05 — missing consultantId fails', () => {
      const errors = validateReview({ doctorId: 'D1', rating: 3 });
      expect(errors).toContain('consultantId is required');
    });
  });
});
