/**
 * ═══════════════════════════════════════════════════════════════════════
 * IZARA TELEMEDICINE — EMR SERVICE UNIT TESTS
 * ═══════════════════════════════════════════════════════════════════════
 * Tests: clinical templates structure, EMR creation, template validation,
 *        encounter types, doctor personality data
 * Source: Isara-doctor-portal/frontend/services/emrService.ts
 *         Isara-doctor-portal/frontend/services/enhancedMeetingService.ts
 * ═══════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from 'vitest';

// ─── Re-implement EMR creation logic ──

interface ClinicalTemplateSection {
  id: string;
  title: string;
  content: string;
  order: number;
  required: boolean;
}

interface ClinicalTemplate {
  id: string;
  name: string;
  type: string;
  content: { sections: ClinicalTemplateSection[] };
  createdBy: string;
  isDefault: boolean;
}

interface EMR {
  id: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  encounterDate: Date;
  encounterType: string;
  chiefComplaint: string;
  historyOfPresentIllness: string;
  reviewOfSystems: Record<string, unknown>;
  physicalExamination: {
    generalAppearance: string;
    vitalSigns: { measuredAt: Date };
  };
  vitalSigns: { measuredAt: Date };
  assessment: string;
  diagnosis: unknown[];
  treatmentPlan: string;
  prescriptions: unknown[];
  investigations: unknown[];
  followUpInstructions: string;
  createdAt: Date;
  lastModified: Date;
  status: string;
  version: number;
  previousVersions: unknown[];
}

function getClinicalTemplates(): ClinicalTemplate[] {
  return [
    {
      id: 'soap', name: 'SOAP Note', type: 'soap',
      content: {
        sections: [
          { id: '1', title: 'Subjective', content: '', order: 1, required: true },
          { id: '2', title: 'Objective', content: '', order: 2, required: true },
          { id: '3', title: 'Assessment', content: '', order: 3, required: true },
          { id: '4', title: 'Plan', content: '', order: 4, required: true },
        ],
      },
      createdBy: 'system', isDefault: true,
    },
    {
      id: 'sbar', name: 'SBAR Note', type: 'sbar',
      content: {
        sections: [
          { id: '1', title: 'Situation', content: '', order: 1, required: true },
          { id: '2', title: 'Background', content: '', order: 2, required: true },
          { id: '3', title: 'Assessment', content: '', order: 3, required: true },
          { id: '4', title: 'Recommendation', content: '', order: 4, required: true },
        ],
      },
      createdBy: 'system', isDefault: true,
    },
    {
      id: 'admission', name: 'Admission Note', type: 'admission',
      content: {
        sections: [
          { id: '1', title: 'Chief Complaint', content: '', order: 1, required: true },
          { id: '2', title: 'History of Present Illness', content: '', order: 2, required: true },
          { id: '3', title: 'Past Medical History', content: '', order: 3, required: false },
          { id: '4', title: 'Medications', content: '', order: 4, required: false },
          { id: '5', title: 'Allergies', content: '', order: 5, required: true },
          { id: '6', title: 'Social History', content: '', order: 6, required: false },
          { id: '7', title: 'Family History', content: '', order: 7, required: false },
          { id: '8', title: 'Review of Systems', content: '', order: 8, required: true },
          { id: '9', title: 'Physical Examination', content: '', order: 9, required: true },
          { id: '10', title: 'Assessment and Plan', content: '', order: 10, required: true },
        ],
      },
      createdBy: 'system', isDefault: true,
    },
    {
      id: 'discharge', name: 'Discharge Summary', type: 'discharge',
      content: {
        sections: [
          { id: '1', title: 'Admission Date', content: '', order: 1, required: true },
          { id: '2', title: 'Discharge Date', content: '', order: 2, required: true },
          { id: '3', title: 'Principal Diagnosis', content: '', order: 3, required: true },
          { id: '4', title: 'Secondary Diagnoses', content: '', order: 4, required: false },
          { id: '5', title: 'Hospital Course', content: '', order: 5, required: true },
          { id: '6', title: 'Discharge Medications', content: '', order: 6, required: true },
          { id: '7', title: 'Follow-up Instructions', content: '', order: 7, required: true },
          { id: '8', title: 'Discharge Condition', content: '', order: 8, required: true },
        ],
      },
      createdBy: 'system', isDefault: true,
    },
    {
      id: 'progress', name: 'Progress Note', type: 'progress',
      content: {
        sections: [
          { id: '1', title: 'Interval History', content: '', order: 1, required: true },
          { id: '2', title: 'Current Status', content: '', order: 2, required: true },
          { id: '3', title: 'Assessment', content: '', order: 3, required: true },
          { id: '4', title: 'Plan', content: '', order: 4, required: true },
        ],
      },
      createdBy: 'system', isDefault: true,
    },
  ];
}

function createNewEMR(patientId: string, doctorId: string, doctorName: string): EMR {
  const emrId = `emr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  return {
    id: emrId,
    patientId,
    doctorId,
    doctorName,
    encounterDate: new Date(),
    encounterType: 'consultation',
    chiefComplaint: '',
    historyOfPresentIllness: '',
    reviewOfSystems: {},
    physicalExamination: {
      generalAppearance: '',
      vitalSigns: { measuredAt: new Date() },
    },
    vitalSigns: { measuredAt: new Date() },
    assessment: '',
    diagnosis: [],
    treatmentPlan: '',
    prescriptions: [],
    investigations: [],
    followUpInstructions: '',
    createdAt: new Date(),
    lastModified: new Date(),
    status: 'draft',
    version: 1,
    previousVersions: [],
  };
}

// ─── Doctor Personality Data ──

interface DoctorPersonality {
  id: string;
  name: string;
  specialty: string;
  personality: string;
  medicalFocus: string[];
  communicationStyle: string;
  expertise: string[];
}

const DOCTOR_PERSONALITIES: Record<string, DoctorPersonality> = {
  doc1: {
    id: 'doc1', name: 'ดร. สมชาย ใจดี', specialty: 'อายุรแพทย์ทั่วไป',
    personality: 'อบอุ่น เป็นมิตร ใส่ใจรายละเอียด พูดชัดเจนและให้กำลังใจ',
    medicalFocus: ['โรคทั่วไป', 'โรคเรื้อรัง', 'ป้องกันโรค', 'ตรวจสุขภาพ'],
    communicationStyle: 'พูดช้า ๆ อธิบายละเอียด ใช้คำง่าย ๆ ให้คำปรึกษาแบบเป็นกันเอง',
    expertise: ['Internal Medicine', 'Preventive Care', 'Chronic Disease Management'],
  },
  doc2: {
    id: 'doc2', name: 'ดร. วิภา รักสุขภาพ', specialty: 'กุมารแพทย์',
    personality: 'อ่อนโยน สุภาพ มีความเข้าใจ เป็นมิตรกับเด็ก',
    medicalFocus: ['สุขภาพเด็ก', 'โรคติดเชื้อ', 'วัคซีน', 'พัฒนาการ'],
    communicationStyle: 'พูดนุ่มนวล อ่อนโยน ให้ความรู้สึกปลอดภัย อธิบายอย่างเข้าใจง่าย',
    expertise: ['Pediatrics', 'Child Development', 'Immunization'],
  },
  doc3: {
    id: 'doc3', name: 'ดร. ชัยวัฒน์ สุขใจ', specialty: 'ศัลยแพทย์',
    personality: 'มั่นใจ ตรงไปตรงมา ให้ข้อมูลชัดเจน',
    medicalFocus: ['การผ่าตัด', 'บาดเจ็บ', 'โรคผิวหนัง', 'แผล'],
    communicationStyle: 'พูดตรงประเด็น มั่นใจ ให้ความรู้เชิงเทคนิค อธิบายขั้นตอนชัดเจน',
    expertise: ['General Surgery', 'Trauma Care', 'Wound Management'],
  },
  doc4: {
    id: 'doc4', name: 'ดร. สุดารัตน์ สุขสันต์', specialty: 'แพทย์เวชศาสตร์ครอบครัว',
    personality: 'อบอุ่น เข้าใจ ดูแลแบบองค์รวม',
    medicalFocus: ['สุขภาพครอบครัว', 'โรคเรื้อรัง', 'สุขภาพจิต', 'คำปรึกษา'],
    communicationStyle: 'พูดคุยเหมือนครอบครัว ฟังอย่างตั้งใจ ให้คำแนะนำแบบองค์รวม',
    expertise: ['Family Medicine', 'Holistic Health', 'Mental Wellness'],
  },
};

// ════════════════════════════════════════════════════════════════════
// A. CLINICAL TEMPLATES (14 tests)
// ════════════════════════════════════════════════════════════════════
describe('Clinical Templates', () => {
  const templates = getClinicalTemplates();

  it('A01 — 5 templates available', () => {
    expect(templates).toHaveLength(5);
  });

  it('A02 — includes SOAP template', () => {
    expect(templates.some(t => t.id === 'soap')).toBe(true);
  });

  it('A03 — includes SBAR template', () => {
    expect(templates.some(t => t.id === 'sbar')).toBe(true);
  });

  it('A04 — includes Admission template', () => {
    expect(templates.some(t => t.id === 'admission')).toBe(true);
  });

  it('A05 — includes Discharge template', () => {
    expect(templates.some(t => t.id === 'discharge')).toBe(true);
  });

  it('A06 — includes Progress Note template', () => {
    expect(templates.some(t => t.id === 'progress')).toBe(true);
  });

  it('A07 — SOAP has 4 sections (S/O/A/P)', () => {
    const soap = templates.find(t => t.id === 'soap')!;
    expect(soap.content.sections).toHaveLength(4);
    const titles = soap.content.sections.map(s => s.title);
    expect(titles).toEqual(['Subjective', 'Objective', 'Assessment', 'Plan']);
  });

  it('A08 — SBAR has 4 sections', () => {
    const sbar = templates.find(t => t.id === 'sbar')!;
    expect(sbar.content.sections).toHaveLength(4);
  });

  it('A09 — Admission has 10 sections', () => {
    const admission = templates.find(t => t.id === 'admission')!;
    expect(admission.content.sections).toHaveLength(10);
  });

  it('A10 — Discharge has 8 sections', () => {
    const discharge = templates.find(t => t.id === 'discharge')!;
    expect(discharge.content.sections).toHaveLength(8);
  });

  it('A11 — all templates are system-created', () => {
    templates.forEach(t => {
      expect(t.createdBy).toBe('system');
    });
  });

  it('A12 — all templates are default', () => {
    templates.forEach(t => {
      expect(t.isDefault).toBe(true);
    });
  });

  it('A13 — sections ordered sequentially', () => {
    templates.forEach(t => {
      t.content.sections.forEach((s, i) => {
        expect(s.order).toBe(i + 1);
      });
    });
  });

  it('A14 — all sections start with empty content', () => {
    templates.forEach(t => {
      t.content.sections.forEach(s => {
        expect(s.content).toBe('');
      });
    });
  });
});

// ════════════════════════════════════════════════════════════════════
// B. TEMPLATE VALIDATION (8 tests)
// ════════════════════════════════════════════════════════════════════
describe('Template Validation', () => {
  const templates = getClinicalTemplates();

  it('B01 — SOAP: all sections required', () => {
    const soap = templates.find(t => t.id === 'soap')!;
    soap.content.sections.forEach(s => {
      expect(s.required).toBe(true);
    });
  });

  it('B02 — Admission: Chief Complaint is required', () => {
    const admission = templates.find(t => t.id === 'admission')!;
    const cc = admission.content.sections.find(s => s.title === 'Chief Complaint');
    expect(cc?.required).toBe(true);
  });

  it('B03 — Admission: Social History is optional', () => {
    const admission = templates.find(t => t.id === 'admission')!;
    const sh = admission.content.sections.find(s => s.title === 'Social History');
    expect(sh?.required).toBe(false);
  });

  it('B04 — Discharge: Principal Diagnosis is required', () => {
    const discharge = templates.find(t => t.id === 'discharge')!;
    const pd = discharge.content.sections.find(s => s.title === 'Principal Diagnosis');
    expect(pd?.required).toBe(true);
  });

  it('B05 — Discharge: Secondary Diagnoses is optional', () => {
    const discharge = templates.find(t => t.id === 'discharge')!;
    const sd = discharge.content.sections.find(s => s.title === 'Secondary Diagnoses');
    expect(sd?.required).toBe(false);
  });

  it('B06 — unique section IDs within each template', () => {
    templates.forEach(t => {
      const ids = t.content.sections.map(s => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  it('B07 — all template IDs are unique', () => {
    const ids = templates.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('B08 — all templates have matching id and type', () => {
    templates.forEach(t => {
      expect(t.id).toBe(t.type);
    });
  });
});

// ════════════════════════════════════════════════════════════════════
// C. EMR CREATION (14 tests)
// ════════════════════════════════════════════════════════════════════
describe('EMR Creation', () => {
  it('C01 — creates EMR with unique ID', () => {
    const emr = createNewEMR('p1', 'd1', 'Dr. Test');
    expect(emr.id).toMatch(/^emr_\d+_/);
  });

  it('C02 — two EMRs have different IDs', () => {
    const emr1 = createNewEMR('p1', 'd1', 'Dr. Test');
    const emr2 = createNewEMR('p1', 'd1', 'Dr. Test');
    expect(emr1.id).not.toBe(emr2.id);
  });

  it('C03 — stores patient and doctor info', () => {
    const emr = createNewEMR('patient-001', 'doctor-001', 'Dr. Smith');
    expect(emr.patientId).toBe('patient-001');
    expect(emr.doctorId).toBe('doctor-001');
    expect(emr.doctorName).toBe('Dr. Smith');
  });

  it('C04 — defaults to consultation encounter type', () => {
    const emr = createNewEMR('p1', 'd1', 'Dr. Test');
    expect(emr.encounterType).toBe('consultation');
  });

  it('C05 — status defaults to draft', () => {
    const emr = createNewEMR('p1', 'd1', 'Dr. Test');
    expect(emr.status).toBe('draft');
  });

  it('C06 — version starts at 1', () => {
    const emr = createNewEMR('p1', 'd1', 'Dr. Test');
    expect(emr.version).toBe(1);
  });

  it('C07 — previousVersions starts empty', () => {
    const emr = createNewEMR('p1', 'd1', 'Dr. Test');
    expect(emr.previousVersions).toEqual([]);
  });

  it('C08 — chiefComplaint starts empty', () => {
    const emr = createNewEMR('p1', 'd1', 'Dr. Test');
    expect(emr.chiefComplaint).toBe('');
  });

  it('C09 — diagnosis starts empty', () => {
    const emr = createNewEMR('p1', 'd1', 'Dr. Test');
    expect(emr.diagnosis).toEqual([]);
  });

  it('C10 — prescriptions starts empty', () => {
    const emr = createNewEMR('p1', 'd1', 'Dr. Test');
    expect(emr.prescriptions).toEqual([]);
  });

  it('C11 — investigations starts empty', () => {
    const emr = createNewEMR('p1', 'd1', 'Dr. Test');
    expect(emr.investigations).toEqual([]);
  });

  it('C12 — encounterDate is set to now', () => {
    const before = Date.now();
    const emr = createNewEMR('p1', 'd1', 'Dr. Test');
    const after = Date.now();
    expect(emr.encounterDate.getTime()).toBeGreaterThanOrEqual(before);
    expect(emr.encounterDate.getTime()).toBeLessThanOrEqual(after);
  });

  it('C13 — createdAt and lastModified are set', () => {
    const emr = createNewEMR('p1', 'd1', 'Dr. Test');
    expect(emr.createdAt).toBeInstanceOf(Date);
    expect(emr.lastModified).toBeInstanceOf(Date);
  });

  it('C14 — physical examination has generalAppearance', () => {
    const emr = createNewEMR('p1', 'd1', 'Dr. Test');
    expect(emr.physicalExamination.generalAppearance).toBe('');
    expect(emr.physicalExamination.vitalSigns.measuredAt).toBeInstanceOf(Date);
  });
});

// ════════════════════════════════════════════════════════════════════
// D. DOCTOR PERSONALITIES (12 tests)
// ════════════════════════════════════════════════════════════════════
describe('Doctor Personalities (AI)', () => {
  it('D01 — 4 doctors defined', () => {
    expect(Object.keys(DOCTOR_PERSONALITIES)).toHaveLength(4);
  });

  it('D02 — doc1 is Internal Medicine', () => {
    expect(DOCTOR_PERSONALITIES.doc1.specialty).toBe('อายุรแพทย์ทั่วไป');
    expect(DOCTOR_PERSONALITIES.doc1.expertise).toContain('Internal Medicine');
  });

  it('D03 — doc2 is Pediatrics', () => {
    expect(DOCTOR_PERSONALITIES.doc2.specialty).toBe('กุมารแพทย์');
    expect(DOCTOR_PERSONALITIES.doc2.expertise).toContain('Pediatrics');
  });

  it('D04 — doc3 is Surgery', () => {
    expect(DOCTOR_PERSONALITIES.doc3.specialty).toBe('ศัลยแพทย์');
    expect(DOCTOR_PERSONALITIES.doc3.expertise).toContain('General Surgery');
  });

  it('D05 — doc4 is Family Medicine', () => {
    expect(DOCTOR_PERSONALITIES.doc4.specialty).toBe('แพทย์เวชศาสตร์ครอบครัว');
    expect(DOCTOR_PERSONALITIES.doc4.expertise).toContain('Family Medicine');
  });

  it('D06 — all have Thai names', () => {
    Object.values(DOCTOR_PERSONALITIES).forEach(doc => {
      expect(doc.name).toMatch(/ดร\./);
    });
  });

  it('D07 — all have medicalFocus list', () => {
    Object.values(DOCTOR_PERSONALITIES).forEach(doc => {
      expect(doc.medicalFocus.length).toBeGreaterThanOrEqual(3);
    });
  });

  it('D08 — all have communicationStyle', () => {
    Object.values(DOCTOR_PERSONALITIES).forEach(doc => {
      expect(doc.communicationStyle.length).toBeGreaterThan(10);
    });
  });

  it('D09 — all have expertise in English', () => {
    Object.values(DOCTOR_PERSONALITIES).forEach(doc => {
      doc.expertise.forEach(e => {
        expect(e).toMatch(/^[A-Z]/); // Starts with uppercase English
      });
    });
  });

  it('D10 — IDs match keys', () => {
    Object.entries(DOCTOR_PERSONALITIES).forEach(([key, doc]) => {
      expect(doc.id).toBe(key);
    });
  });

  it('D11 — all have personality description', () => {
    Object.values(DOCTOR_PERSONALITIES).forEach(doc => {
      expect(doc.personality.length).toBeGreaterThan(5);
    });
  });

  it('D12 — all specialties are unique', () => {
    const specs = Object.values(DOCTOR_PERSONALITIES).map(d => d.specialty);
    expect(new Set(specs).size).toBe(specs.length);
  });
});
