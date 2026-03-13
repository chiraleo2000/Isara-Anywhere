// ============================================================================
// Living Will Workflow Tests — Patient Portal
// Based on: Processes/Living_Will_Processes.md & Living_Will_Implementation_Plan.md
// Tests: PDPA-compliant Living Will creation, sharing, proxy designation
// ============================================================================

import { describe, it, expect } from 'vitest';

// --- Types (matching sharedPHRTypes.ts) ---

interface LivingWillData {
  id?: string;
  patientId: string;
  status: 'draft' | 'active' | 'revoked';
  sharingPreference: 'private' | 'shared_with_doctors';
  healthcareProxy?: {
    name: string;
    relationship: string;
    phone: string;
    idNumber?: string;
  };
  treatmentPreferences: {
    cpr: boolean;
    ventilator: boolean;
    feedingTube: boolean;
    dialysis: boolean;
    bloodTransfusion: boolean;
    antibiotics: boolean;
    painManagement: 'full' | 'comfort_only' | 'none';
    organDonation: boolean;
  };
  witnesses?: { name: string; idNumber?: string }[];
  digitalSignature?: string;
  createdAt?: string;
  updatedAt?: string;
}

// --- Helper Functions ---

function validateLivingWill(data: Partial<LivingWillData>): string[] {
  const errors: string[] = [];
  if (!data.patientId) errors.push('patientId is required');
  if (!data.treatmentPreferences) errors.push('treatmentPreferences is required');
  if (data.treatmentPreferences) {
    const tp = data.treatmentPreferences;
    if (typeof tp.cpr !== 'boolean') errors.push('cpr must be boolean');
    if (typeof tp.ventilator !== 'boolean') errors.push('ventilator must be boolean');
    if (typeof tp.feedingTube !== 'boolean') errors.push('feedingTube must be boolean');
    if (!['full', 'comfort_only', 'none'].includes(tp.painManagement)) {
      errors.push('painManagement must be full, comfort_only, or none');
    }
  }
  if (data.sharingPreference && !['private', 'shared_with_doctors'].includes(data.sharingPreference)) {
    errors.push('sharingPreference must be private or shared_with_doctors');
  }
  return errors;
}

function canDoctorAccessLivingWill(
  livingWill: LivingWillData,
  doctorHasPatientHistory: boolean
): boolean {
  if (livingWill.status !== 'active') return false;
  if (livingWill.sharingPreference === 'private') return false;
  if (livingWill.sharingPreference === 'shared_with_doctors' && doctorHasPatientHistory) return true;
  return false;
}

function generateLivingWillId(patientId: string): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).substring(2, 8);
  return `LW-${patientId}-${ts}-${rand}`;
}

function validateHealthcareProxy(proxy: LivingWillData['healthcareProxy']): string[] {
  const errors: string[] = [];
  if (!proxy) return ['Healthcare proxy is required'];
  if (!proxy.name || proxy.name.trim().length === 0) errors.push('Proxy name is required');
  if (!proxy.relationship) errors.push('Relationship is required');
  if (!proxy.phone) errors.push('Phone is required');
  if (proxy.phone && !/^0\d{8,9}$/.test(proxy.phone)) errors.push('Invalid Thai phone number format');
  return errors;
}

function formatLivingWillForDisplay(lw: LivingWillData, lang: 'th' | 'en' = 'th'): { title: string; statusLabel: string } {
  const titles = { th: 'พินัยกรรมชีวิต', en: 'Living Will' };
  const statusLabels: Record<string, Record<string, string>> = {
    draft: { th: 'ฉบับร่าง', en: 'Draft' },
    active: { th: 'มีผลบังคับ', en: 'Active' },
    revoked: { th: 'ยกเลิก', en: 'Revoked' },
  };
  return { title: titles[lang], statusLabel: statusLabels[lw.status]?.[lang] || lw.status };
}

function canPatientModify(lw: LivingWillData, requesterId: string): boolean {
  return lw.patientId === requesterId && lw.status !== 'revoked';
}

function calculateCompletionPercentage(lw: Partial<LivingWillData>): number {
  let total = 4; // proxy, preferences, signature, sharing
  let done = 0;
  if (lw.healthcareProxy?.name) done++;
  if (lw.treatmentPreferences) done++;
  if (lw.digitalSignature) done++;
  if (lw.sharingPreference) done++;
  return Math.round((done / total) * 100);
}

// --- Tests ---

describe('Living Will Workflow (Process: Living_Will_Processes.md)', () => {

  describe('A — Living Will Validation', () => {
    it('A01 — valid living will passes validation', () => {
      const errors = validateLivingWill({
        patientId: 'PAT-001',
        treatmentPreferences: {
          cpr: false, ventilator: false, feedingTube: false,
          dialysis: true, bloodTransfusion: true, antibiotics: true,
          painManagement: 'comfort_only', organDonation: true,
        },
        sharingPreference: 'shared_with_doctors',
      });
      expect(errors).toHaveLength(0);
    });

    it('A02 — missing patientId fails', () => {
      const errors = validateLivingWill({
        treatmentPreferences: {
          cpr: false, ventilator: false, feedingTube: false,
          dialysis: false, bloodTransfusion: false, antibiotics: false,
          painManagement: 'full', organDonation: false,
        },
      });
      expect(errors).toContain('patientId is required');
    });

    it('A03 — missing treatment preferences fails', () => {
      const errors = validateLivingWill({ patientId: 'PAT-001' });
      expect(errors).toContain('treatmentPreferences is required');
    });

    it('A04 — invalid painManagement fails', () => {
      const errors = validateLivingWill({
        patientId: 'PAT-001',
        treatmentPreferences: {
          cpr: false, ventilator: false, feedingTube: false,
          dialysis: false, bloodTransfusion: false, antibiotics: false,
          painManagement: 'invalid' as any, organDonation: false,
        },
      });
      expect(errors).toContain('painManagement must be full, comfort_only, or none');
    });

    it('A05 — invalid sharing preference fails', () => {
      const errors = validateLivingWill({
        patientId: 'PAT-001',
        treatmentPreferences: {
          cpr: false, ventilator: false, feedingTube: false,
          dialysis: false, bloodTransfusion: false, antibiotics: false,
          painManagement: 'full', organDonation: false,
        },
        sharingPreference: 'public' as any,
      });
      expect(errors).toContain('sharingPreference must be private or shared_with_doctors');
    });
  });

  describe('B — PDPA Doctor Access Control', () => {
    const activeLW: LivingWillData = {
      patientId: 'PAT-001', status: 'active',
      sharingPreference: 'shared_with_doctors',
      treatmentPreferences: {
        cpr: false, ventilator: false, feedingTube: false,
        dialysis: false, bloodTransfusion: false, antibiotics: false,
        painManagement: 'comfort_only', organDonation: true,
      },
    };

    it('B01 — doctor with history can access shared living will', () => {
      expect(canDoctorAccessLivingWill(activeLW, true)).toBe(true);
    });

    it('B02 — doctor without history cannot access shared living will', () => {
      expect(canDoctorAccessLivingWill(activeLW, false)).toBe(false);
    });

    it('B03 — doctor cannot access private living will', () => {
      const privateLW = { ...activeLW, sharingPreference: 'private' as const };
      expect(canDoctorAccessLivingWill(privateLW, true)).toBe(false);
    });

    it('B04 — doctor cannot access draft living will', () => {
      const draftLW = { ...activeLW, status: 'draft' as const };
      expect(canDoctorAccessLivingWill(draftLW, true)).toBe(false);
    });

    it('B05 — doctor cannot access revoked living will', () => {
      const revokedLW = { ...activeLW, status: 'revoked' as const };
      expect(canDoctorAccessLivingWill(revokedLW, true)).toBe(false);
    });
  });

  describe('C — Living Will ID Generation', () => {
    it('C01 — ID starts with LW- prefix', () => {
      expect(generateLivingWillId('PAT-001')).toMatch(/^LW-PAT-001-/);
    });

    it('C02 — IDs are unique', () => {
      const id1 = generateLivingWillId('PAT-001');
      const id2 = generateLivingWillId('PAT-001');
      expect(id1).not.toBe(id2);
    });
  });

  describe('D — Healthcare Proxy Validation', () => {
    it('D01 — valid proxy passes', () => {
      const errors = validateHealthcareProxy({
        name: 'สมหญิง มั่นคง', relationship: 'spouse', phone: '0812345678',
      });
      expect(errors).toHaveLength(0);
    });

    it('D02 — missing proxy fails', () => {
      const errors = validateHealthcareProxy(undefined);
      expect(errors).toContain('Healthcare proxy is required');
    });

    it('D03 — empty name fails', () => {
      const errors = validateHealthcareProxy({ name: '', relationship: 'spouse', phone: '0812345678' });
      expect(errors).toContain('Proxy name is required');
    });

    it('D04 — invalid Thai phone fails', () => {
      const errors = validateHealthcareProxy({ name: 'Test', relationship: 'child', phone: '123' });
      expect(errors).toContain('Invalid Thai phone number format');
    });

    it('D05 — valid 10-digit Thai phone passes', () => {
      const errors = validateHealthcareProxy({ name: 'Test', relationship: 'child', phone: '0912345678' });
      expect(errors).toHaveLength(0);
    });
  });

  describe('E — Display Formatting (Thai/English)', () => {
    const lw: LivingWillData = {
      patientId: 'PAT-001', status: 'active', sharingPreference: 'shared_with_doctors',
      treatmentPreferences: {
        cpr: false, ventilator: false, feedingTube: false,
        dialysis: false, bloodTransfusion: false, antibiotics: false,
        painManagement: 'full', organDonation: false,
      },
    };

    it('E01 — Thai title is correct', () => {
      expect(formatLivingWillForDisplay(lw, 'th').title).toBe('พินัยกรรมชีวิต');
    });

    it('E02 — English title is correct', () => {
      expect(formatLivingWillForDisplay(lw, 'en').title).toBe('Living Will');
    });

    it('E03 — active status in Thai', () => {
      expect(formatLivingWillForDisplay(lw, 'th').statusLabel).toBe('มีผลบังคับ');
    });

    it('E04 — draft status in English', () => {
      const draft = { ...lw, status: 'draft' as const };
      expect(formatLivingWillForDisplay(draft, 'en').statusLabel).toBe('Draft');
    });

    it('E05 — revoked status in Thai', () => {
      const revoked = { ...lw, status: 'revoked' as const };
      expect(formatLivingWillForDisplay(revoked, 'th').statusLabel).toBe('ยกเลิก');
    });
  });

  describe('F — Patient Modification Rights', () => {
    const lw: LivingWillData = {
      patientId: 'PAT-001', status: 'active', sharingPreference: 'private',
      treatmentPreferences: {
        cpr: true, ventilator: true, feedingTube: true,
        dialysis: true, bloodTransfusion: true, antibiotics: true,
        painManagement: 'full', organDonation: true,
      },
    };

    it('F01 — patient can modify own active will', () => {
      expect(canPatientModify(lw, 'PAT-001')).toBe(true);
    });

    it('F02 — patient can modify own draft will', () => {
      expect(canPatientModify({ ...lw, status: 'draft' }, 'PAT-001')).toBe(true);
    });

    it('F03 — patient cannot modify revoked will', () => {
      expect(canPatientModify({ ...lw, status: 'revoked' }, 'PAT-001')).toBe(false);
    });

    it('F04 — other patient cannot modify', () => {
      expect(canPatientModify(lw, 'PAT-999')).toBe(false);
    });
  });

  describe('G — Wizard Completion Percentage', () => {
    it('G01 — empty will is 0%', () => {
      expect(calculateCompletionPercentage({})).toBe(0);
    });

    it('G02 — with proxy is 25%', () => {
      expect(calculateCompletionPercentage({ healthcareProxy: { name: 'Test', relationship: 'spouse', phone: '0812345678' } })).toBe(25);
    });

    it('G03 — fully complete is 100%', () => {
      expect(calculateCompletionPercentage({
        healthcareProxy: { name: 'Test', relationship: 'spouse', phone: '0812345678' },
        treatmentPreferences: { cpr: false, ventilator: false, feedingTube: false, dialysis: false, bloodTransfusion: false, antibiotics: false, painManagement: 'full', organDonation: false },
        digitalSignature: 'sig-data',
        sharingPreference: 'shared_with_doctors',
      })).toBe(100);
    });

    it('G04 — half complete is 50%', () => {
      expect(calculateCompletionPercentage({
        healthcareProxy: { name: 'Test', relationship: 'spouse', phone: '0812345678' },
        treatmentPreferences: { cpr: false, ventilator: false, feedingTube: false, dialysis: false, bloodTransfusion: false, antibiotics: false, painManagement: 'full', organDonation: false },
      })).toBe(50);
    });
  });
});
