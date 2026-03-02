/**
 * ═══════════════════════════════════════════════════════════════════════
 * IZARA TELEMEDICINE — Doctor Portal EMR & Clinical Workflow Tests
 * ═══════════════════════════════════════════════════════════════════════
 * Tests: EMR creation/validation, SOAP notes, prescription logic,
 * lab order workfow, imaging orders, patient management.
 * ═══════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from 'vitest';

// ═══════════════════════════════════════════════════════════════════════
// A. EMR/SOAP Note Validation
// ═══════════════════════════════════════════════════════════════════════
describe('Doctor — EMR SOAP Note Validation', () => {
  interface SOAPNote {
    patientId: string;
    type: 'SOAP' | 'progress' | 'consultation';
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
    icd10?: string[];
    aiAssisted?: boolean;
  }

  function validateSOAP(note: SOAPNote): string[] {
    const errors: string[] = [];
    if (!note.patientId) errors.push('Patient ID required');
    if (!['SOAP', 'progress', 'consultation'].includes(note.type)) errors.push('Invalid EMR type');
    if (!note.subjective || note.subjective.length < 5) errors.push('Subjective too short');
    if (!note.objective || note.objective.length < 5) errors.push('Objective too short');
    if (!note.assessment || note.assessment.length < 5) errors.push('Assessment too short');
    if (!note.plan || note.plan.length < 5) errors.push('Plan too short');
    if (note.icd10 && note.icd10.some(code => !/^[A-Z]\d{2}(\.\d{1,2})?$/.test(code))) {
      errors.push('Invalid ICD-10 code format');
    }
    return errors;
  }

  it('A01 — valid SOAP note passes', () => {
    const soap: SOAPNote = {
      patientId: 'PATIENT-DEMO', type: 'SOAP',
      subjective: 'Patient reports headache for 2 days',
      objective: 'T=37.8°C, BP=130/85, HR=88',
      assessment: 'Tension headache with low-grade fever',
      plan: 'Paracetamol 500mg q6h PRN for 7 days',
      icd10: ['R51', 'R50.9'],
    };
    expect(validateSOAP(soap)).toHaveLength(0);
  });

  it('A02 — rejects empty subjective', () => {
    const soap: SOAPNote = {
      patientId: 'P-1', type: 'SOAP', subjective: '',
      objective: 'Normal exam', assessment: 'Healthy', plan: 'Continue meds',
    };
    expect(validateSOAP(soap)).toContain('Subjective too short');
  });

  it('A03 — validates ICD-10 code format', () => {
    const soap: SOAPNote = {
      patientId: 'P-1', type: 'SOAP',
      subjective: 'Has headache', objective: 'Normal exam',
      assessment: 'Mild headache', plan: 'Rest and water',
      icd10: ['INVALID'],
    };
    expect(validateSOAP(soap)).toContain('Invalid ICD-10 code format');
  });

  it('A04 — accepts all valid ICD-10 formats', () => {
    const validCodes = ['R51', 'R50.9', 'I10', 'E11.65', 'J06.9'];
    for (const code of validCodes) {
      expect(/^[A-Z]\d{2}(\.\d{1,2})?$/.test(code)).toBe(true);
    }
  });

  it('A05 — accepts Thai content in SOAP fields', () => {
    const soap: SOAPNote = {
      patientId: 'P-1', type: 'SOAP',
      subjective: 'ผู้ป่วยมาด้วยอาการปวดศีรษะ 2 วัน',
      objective: 'อุณหภูมิ 37.8°C ความดัน 130/85',
      assessment: 'ปวดศีรษะจากความเครียด',
      plan: 'พาราเซตามอล 500 มก. ทุก 6 ชม.',
    };
    expect(validateSOAP(soap)).toHaveLength(0);
  });

  it('A06 — accepts all EMR types', () => {
    for (const type of ['SOAP', 'progress', 'consultation'] as const) {
      const soap: SOAPNote = {
        patientId: 'P-1', type,
        subjective: 'Has headache', objective: 'Normal exam',
        assessment: 'Mild condition', plan: 'Treat symptomatically',
      };
      expect(validateSOAP(soap)).toHaveLength(0);
    }
  });

  it('A07 — rejects invalid EMR type', () => {
    const soap: SOAPNote = {
      patientId: 'P-1', type: 'invalid' as any,
      subjective: 'Has headache', objective: 'Normal exam',
      assessment: 'Mild condition', plan: 'Follow-up in 1 week',
    };
    expect(validateSOAP(soap)).toContain('Invalid EMR type');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// B. Prescription Validation
// ═══════════════════════════════════════════════════════════════════════
describe('Doctor — Prescription Validation', () => {
  interface PrescriptionMedication {
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    quantity: number;
    route: string;
    warnings?: string[];
  }

  interface Prescription {
    patientId: string;
    medications: PrescriptionMedication[];
    notes?: string;
    prescribedBy: string;
  }

  function validatePrescription(rx: Prescription): string[] {
    const errors: string[] = [];
    if (!rx.patientId) errors.push('Patient ID required');
    if (!rx.prescribedBy) errors.push('Prescriber required');
    if (!rx.medications || rx.medications.length === 0) errors.push('At least 1 medication required');
    rx.medications?.forEach((med, i) => {
      if (!med.name) errors.push(`Medication ${i + 1}: name required`);
      if (!med.dosage) errors.push(`Medication ${i + 1}: dosage required`);
      if (med.quantity <= 0) errors.push(`Medication ${i + 1}: invalid quantity`);
    });
    return errors;
  }

  function checkDrugInteractions(meds: string[]): string[] {
    const knownInteractions: Record<string, string[]> = {
      'Warfarin': ['Aspirin', 'Ibuprofen', 'Naproxen'],
      'Metformin': ['Alcohol'],
      'ACE Inhibitor': ['Potassium Supplement', 'Spironolactone'],
      'Simvastatin': ['Erythromycin', 'Clarithromycin'],
    };
    const warnings: string[] = [];
    for (const med of meds) {
      const interactions = knownInteractions[med];
      if (interactions) {
        for (const other of meds) {
          if (interactions.includes(other)) {
            warnings.push(`⚠️ ${med} + ${other}: potential interaction`);
          }
        }
      }
    }
    return warnings;
  }

  it('B01 — valid prescription passes', () => {
    const rx: Prescription = {
      patientId: 'P-1', prescribedBy: 'DOC-1',
      medications: [{ name: 'Paracetamol', dosage: '500mg', frequency: 'q6h', duration: '7d', quantity: 28, route: 'Oral' }],
    };
    expect(validatePrescription(rx)).toHaveLength(0);
  });

  it('B02 — rejects empty medications', () => {
    const rx: Prescription = { patientId: 'P-1', prescribedBy: 'DOC-1', medications: [] };
    expect(validatePrescription(rx)).toContain('At least 1 medication required');
  });

  it('B03 — rejects medication with zero quantity', () => {
    const rx: Prescription = {
      patientId: 'P-1', prescribedBy: 'DOC-1',
      medications: [{ name: 'Test', dosage: '10mg', frequency: 'daily', duration: '7d', quantity: 0, route: 'Oral' }],
    };
    expect(validatePrescription(rx)).toContain('Medication 1: invalid quantity');
  });

  it('B04 — detects Warfarin + Aspirin interaction', () => {
    const warnings = checkDrugInteractions(['Warfarin', 'Aspirin']);
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]).toContain('Warfarin');
    expect(warnings[0]).toContain('Aspirin');
  });

  it('B05 — no interaction for safe combination', () => {
    const warnings = checkDrugInteractions(['Paracetamol', 'Amoxicillin']);
    expect(warnings).toHaveLength(0);
  });

  it('B06 — detects multiple interactions', () => {
    const warnings = checkDrugInteractions(['Warfarin', 'Aspirin', 'Ibuprofen']);
    expect(warnings.length).toBeGreaterThanOrEqual(2);
  });

  it('B07 — prescription requires prescriber', () => {
    const rx: Prescription = {
      patientId: 'P-1', prescribedBy: '',
      medications: [{ name: 'Test', dosage: '10mg', frequency: 'daily', duration: '7d', quantity: 10, route: 'Oral' }],
    };
    expect(validatePrescription(rx)).toContain('Prescriber required');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// C. Lab Order Validation
// ═══════════════════════════════════════════════════════════════════════
describe('Doctor — Lab Order Validation', () => {
  interface LabTest {
    code: string;
    name: string;
    urgency: 'routine' | 'urgent' | 'stat';
  }

  interface LabOrder {
    patientId: string;
    orderedBy: string;
    tests: LabTest[];
    clinicalIndication: string;
    notes?: string;
  }

  function validateLabOrder(order: LabOrder): string[] {
    const errors: string[] = [];
    if (!order.patientId) errors.push('Patient ID required');
    if (!order.orderedBy) errors.push('Ordering doctor required');
    if (!order.tests || order.tests.length === 0) errors.push('At least 1 test required');
    if (!order.clinicalIndication) errors.push('Clinical indication required');
    order.tests?.forEach((t, i) => {
      if (!t.code) errors.push(`Test ${i + 1}: code required`);
      if (!['routine', 'urgent', 'stat'].includes(t.urgency)) errors.push(`Test ${i + 1}: invalid urgency`);
    });
    return errors;
  }

  function sortByUrgency(orders: LabOrder[]): LabOrder[] {
    const urgencyOrder: Record<string, number> = { stat: 0, urgent: 1, routine: 2 };
    return [...orders].sort((a, b) => {
      const aMax = Math.min(...a.tests.map(t => urgencyOrder[t.urgency] ?? 2));
      const bMax = Math.min(...b.tests.map(t => urgencyOrder[t.urgency] ?? 2));
      return aMax - bMax;
    });
  }

  it('C01 — valid lab order passes', () => {
    const order: LabOrder = {
      patientId: 'P-1', orderedBy: 'DOC-1',
      tests: [{ code: 'CBC', name: 'Complete Blood Count', urgency: 'routine' }],
      clinicalIndication: 'Annual check',
    };
    expect(validateLabOrder(order)).toHaveLength(0);
  });

  it('C02 — rejects empty tests', () => {
    const order: LabOrder = {
      patientId: 'P-1', orderedBy: 'DOC-1', tests: [],
      clinicalIndication: 'Check',
    };
    expect(validateLabOrder(order)).toContain('At least 1 test required');
  });

  it('C03 — rejects invalid urgency', () => {
    const order: LabOrder = {
      patientId: 'P-1', orderedBy: 'DOC-1',
      tests: [{ code: 'CBC', name: 'CBC', urgency: 'invalid' as any }],
      clinicalIndication: 'Check',
    };
    expect(validateLabOrder(order)).toContain('Test 1: invalid urgency');
  });

  it('C04 — sorts orders by urgency (stat first)', () => {
    const orders: LabOrder[] = [
      { patientId: 'P-1', orderedBy: 'D-1', tests: [{ code: 'CBC', name: 'CBC', urgency: 'routine' }], clinicalIndication: 'Check' },
      { patientId: 'P-2', orderedBy: 'D-1', tests: [{ code: 'TROP', name: 'Troponin', urgency: 'stat' }], clinicalIndication: 'Chest pain' },
      { patientId: 'P-3', orderedBy: 'D-1', tests: [{ code: 'BMP', name: 'BMP', urgency: 'urgent' }], clinicalIndication: 'AKI' },
    ];
    const sorted = sortByUrgency(orders);
    expect(sorted[0].patientId).toBe('P-2'); // stat first
    expect(sorted[1].patientId).toBe('P-3'); // urgent second
    expect(sorted[2].patientId).toBe('P-1'); // routine last
  });

  it('C05 — requires clinical indication', () => {
    const order: LabOrder = {
      patientId: 'P-1', orderedBy: 'DOC-1',
      tests: [{ code: 'CBC', name: 'CBC', urgency: 'routine' }],
      clinicalIndication: '',
    };
    expect(validateLabOrder(order)).toContain('Clinical indication required');
  });

  it('C06 — validates all urgency types', () => {
    for (const urgency of ['routine', 'urgent', 'stat'] as const) {
      const order: LabOrder = {
        patientId: 'P-1', orderedBy: 'DOC-1',
        tests: [{ code: 'CBC', name: 'CBC', urgency }],
        clinicalIndication: 'Check',
      };
      expect(validateLabOrder(order)).toHaveLength(0);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// D. Schedule & Queue Management
// ═══════════════════════════════════════════════════════════════════════
describe('Doctor — Schedule & Queue', () => {
  interface TimeSlot { start: string; end: string; available: boolean; }
  interface QueueEntry { id: string; patientId: string; priority: number; status: 'waiting' | 'called' | 'in-progress' | 'done' | 'skipped'; }

  function getAvailableSlots(slots: TimeSlot[]): TimeSlot[] {
    return slots.filter(s => s.available);
  }

  function callNext(queue: QueueEntry[]): QueueEntry | null {
    return queue.filter(e => e.status === 'waiting').sort((a, b) => a.priority - b.priority)[0] ?? null;
  }

  function skipPatient(queue: QueueEntry[], id: string): QueueEntry[] {
    return queue.map(e => e.id === id ? { ...e, status: 'skipped' as const } : e);
  }

  function getQueueStats(queue: QueueEntry[]): { waiting: number; inProgress: number; done: number; skipped: number } {
    return {
      waiting: queue.filter(e => e.status === 'waiting').length,
      inProgress: queue.filter(e => e.status === 'in-progress').length,
      done: queue.filter(e => e.status === 'done').length,
      skipped: queue.filter(e => e.status === 'skipped').length,
    };
  }

  const testQueue: QueueEntry[] = [
    { id: 'Q1', patientId: 'P-1', priority: 2, status: 'waiting' },
    { id: 'Q2', patientId: 'P-2', priority: 1, status: 'waiting' },
    { id: 'Q3', patientId: 'P-3', priority: 3, status: 'done' },
    { id: 'Q4', patientId: 'P-4', priority: 1, status: 'in-progress' },
  ];

  it('D01 — callNext picks highest priority waiting patient', () => {
    const next = callNext(testQueue);
    expect(next!.id).toBe('Q2'); // priority 1
  });

  it('D02 — skipPatient marks as skipped', () => {
    const updated = skipPatient(testQueue, 'Q1');
    expect(updated.find(e => e.id === 'Q1')!.status).toBe('skipped');
  });

  it('D03 — queue stats are correct', () => {
    const stats = getQueueStats(testQueue);
    expect(stats.waiting).toBe(2);
    expect(stats.inProgress).toBe(1);
    expect(stats.done).toBe(1);
  });

  it('D04 — callNext returns null for empty waiting queue', () => {
    const doneQueue: QueueEntry[] = [
      { id: 'Q1', patientId: 'P-1', priority: 1, status: 'done' },
    ];
    expect(callNext(doneQueue)).toBeNull();
  });

  it('D05 — available slots filter works', () => {
    const slots: TimeSlot[] = [
      { start: '09:00', end: '09:30', available: true },
      { start: '09:30', end: '10:00', available: false },
      { start: '10:00', end: '10:30', available: true },
    ];
    expect(getAvailableSlots(slots)).toHaveLength(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// E. Admin Doctor Management
// ═══════════════════════════════════════════════════════════════════════
describe('Doctor — Admin Management', () => {
  interface DoctorApplication {
    id: string;
    name: string;
    email: string;
    medicalLicenseNumber: string;
    specialty: string;
    status: 'pending' | 'approved' | 'rejected' | 'locked' | 'inactive';
  }

  function filterByStatus(doctors: DoctorApplication[], status: DoctorApplication['status']): DoctorApplication[] {
    return doctors.filter(d => d.status === status);
  }

  function approveDoctor(doctors: DoctorApplication[], id: string): DoctorApplication[] {
    return doctors.map(d => d.id === id && d.status === 'pending' ? { ...d, status: 'approved' as const } : d);
  }

  function rejectDoctor(doctors: DoctorApplication[], id: string): DoctorApplication[] {
    return doctors.map(d => d.id === id && d.status === 'pending' ? { ...d, status: 'rejected' as const } : d);
  }

  function validateLicense(licenseNumber: string): boolean {
    return /^(MD|พ)\.\d{4,10}$/.test(licenseNumber) || /^[A-Z]{2,4}\.\d+$/.test(licenseNumber);
  }

  const testDoctors: DoctorApplication[] = [
    { id: 'D1', name: 'Dr. A', email: 'a@test.com', medicalLicenseNumber: 'MD.12345', specialty: 'GP', status: 'pending' },
    { id: 'D2', name: 'Dr. B', email: 'b@test.com', medicalLicenseNumber: 'MD.12346', specialty: 'Cardiology', status: 'approved' },
    { id: 'D3', name: 'Dr. C', email: 'c@test.com', medicalLicenseNumber: 'MD.12347', specialty: 'Surgery', status: 'pending' },
    { id: 'D4', name: 'Dr. D', email: 'd@test.com', medicalLicenseNumber: 'MD.12348', specialty: 'Dermatology', status: 'rejected' },
  ];

  it('E01 — filters pending doctors', () => {
    expect(filterByStatus(testDoctors, 'pending')).toHaveLength(2);
  });

  it('E02 — approves a pending doctor', () => {
    const result = approveDoctor(testDoctors, 'D1');
    expect(result.find(d => d.id === 'D1')!.status).toBe('approved');
  });

  it('E03 — rejects a pending doctor', () => {
    const result = rejectDoctor(testDoctors, 'D3');
    expect(result.find(d => d.id === 'D3')!.status).toBe('rejected');
  });

  it('E04 — cannot approve already-approved doctor', () => {
    const result = approveDoctor(testDoctors, 'D2');
    expect(result.find(d => d.id === 'D2')!.status).toBe('approved'); // unchanged
  });

  it('E05 — validates medical license format', () => {
    expect(validateLicense('MD.12345')).toBe(true);
    expect(validateLicense('INVALID')).toBe(false);
    expect(validateLicense('พ.12345')).toBe(true);
  });

  it('E06 — counts by status', () => {
    const pending = filterByStatus(testDoctors, 'pending').length;
    const approved = filterByStatus(testDoctors, 'approved').length;
    const rejected = filterByStatus(testDoctors, 'rejected').length;
    expect(pending).toBe(2);
    expect(approved).toBe(1);
    expect(rejected).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// F. Medical Content Management
// ═══════════════════════════════════════════════════════════════════════
describe('Doctor — Medical Content', () => {
  interface ContentItem {
    id: string;
    title: string;
    content: string;
    category: string;
    tags: string[];
    status: 'draft' | 'pending' | 'published' | 'rejected';
    language: 'th' | 'en';
    createdBy: string;
  }

  function filterPublished(items: ContentItem[]): ContentItem[] {
    return items.filter(i => i.status === 'published');
  }

  function searchContent(items: ContentItem[], query: string): ContentItem[] {
    const q = query.toLowerCase();
    return items.filter(i =>
      i.title.toLowerCase().includes(q) ||
      i.content.toLowerCase().includes(q) ||
      i.tags.some(t => t.toLowerCase().includes(q))
    );
  }

  function filterByCategory(items: ContentItem[], category: string): ContentItem[] {
    return items.filter(i => i.category === category);
  }

  const testContent: ContentItem[] = [
    { id: 'C1', title: 'โรคเบาหวาน', content: 'เนื้อหาเกี่ยวกับเบาหวาน', category: 'Diabetes', tags: ['diabetes', 'chronic'], status: 'published', language: 'th', createdBy: 'DOC-1' },
    { id: 'C2', title: 'Hypertension Guide', content: 'Managing high blood pressure', category: 'Cardiology', tags: ['hypertension', 'guideline'], status: 'published', language: 'en', createdBy: 'DOC-2' },
    { id: 'C3', title: 'Draft Article', content: 'Not published yet', category: 'General', tags: ['general'], status: 'draft', language: 'en', createdBy: 'DOC-1' },
  ];

  it('F01 — filters published content', () => {
    expect(filterPublished(testContent)).toHaveLength(2);
  });

  it('F02 — searches by title (Thai)', () => {
    expect(searchContent(testContent, 'เบาหวาน')).toHaveLength(1);
  });

  it('F03 — searches by tag', () => {
    expect(searchContent(testContent, 'hypertension')).toHaveLength(1);
  });

  it('F04 — search returns empty for no match', () => {
    expect(searchContent(testContent, 'xyz999')).toHaveLength(0);
  });

  it('F05 — filters by category', () => {
    expect(filterByCategory(testContent, 'Cardiology')).toHaveLength(1);
  });

  it('F06 — search is case-insensitive', () => {
    expect(searchContent(testContent, 'DIABETES')).toHaveLength(1);
  });
});
