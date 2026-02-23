/**
 * ═══════════════════════════════════════════════════════════════════════
 * ISARA-ANYWHERE — PDPA Consent Manager
 * ═══════════════════════════════════════════════════════════════════════
 * Manages patient consent workflows for Thailand's Personal Data
 * Protection Act (PDPA) compliance in the omnichannel system.
 * ═══════════════════════════════════════════════════════════════════════
 */

export type ConsentStatus = 'pending' | 'granted' | 'declined' | 'expired' | 'withdrawn';

export interface ConsentRecord {
  patientId: string;
  status: ConsentStatus;
  version: string;
  grantedAt?: string;
  expiresAt?: string;
  channel: string;
  ipAddress?: string;
  purposes: ConsentPurpose[];
}

export interface ConsentPurpose {
  id: string;
  name: string;
  description: string;
  required: boolean;
  accepted: boolean;
}

export const PDPA_CONSENT_VERSION = '1.0.0';

export const DEFAULT_CONSENT_PURPOSES: ConsentPurpose[] = [
  {
    id: 'medical_data_collection',
    name: 'Medical Data Collection',
    description: 'Collection and storage of your medical history, symptoms, and health data for treatment purposes.',
    required: true,
    accepted: false,
  },
  {
    id: 'ai_processing',
    name: 'AI-Assisted Medical Processing',
    description: 'Use of AI systems to analyze your health data and provide preliminary medical assessments.',
    required: true,
    accepted: false,
  },
  {
    id: 'healthcare_team_sharing',
    name: 'Healthcare Team Data Sharing',
    description: 'Sharing your medical data with authorized healthcare professionals involved in your care.',
    required: true,
    accepted: false,
  },
  {
    id: 'notifications',
    name: 'Health Notifications',
    description: 'Receiving medication reminders, appointment notifications, and follow-up messages via your preferred channel.',
    required: false,
    accepted: false,
  },
  {
    id: 'research',
    name: 'Anonymized Research Use',
    description: 'Use of de-identified data for medical research and service improvement.',
    required: false,
    accepted: false,
  },
];

const CONSENT_EXPIRY_DAYS = 365;

export function createConsentRecord(
  patientId: string,
  channel: string,
  purposes?: ConsentPurpose[],
): ConsentRecord {
  if (!patientId || typeof patientId !== 'string') {
    throw new Error('patientId is required');
  }
  if (!channel || typeof channel !== 'string') {
    throw new Error('channel is required');
  }

  return {
    patientId,
    status: 'pending',
    version: PDPA_CONSENT_VERSION,
    channel,
    purposes: purposes || DEFAULT_CONSENT_PURPOSES.map(p => ({ ...p })),
  };
}

export function grantConsent(
  record: ConsentRecord,
  acceptedPurposeIds: string[],
): ConsentRecord {
  // Check that all required purposes are accepted
  const requiredPurposes = record.purposes.filter(p => p.required);
  const missingRequired = requiredPurposes.filter(
    p => !acceptedPurposeIds.includes(p.id),
  );

  if (missingRequired.length > 0) {
    throw new Error(
      `Required consent purposes not accepted: ${missingRequired.map(p => p.name).join(', ')}`,
    );
  }

  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + CONSENT_EXPIRY_DAYS);

  return {
    ...record,
    status: 'granted',
    grantedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    purposes: record.purposes.map(p => ({
      ...p,
      accepted: acceptedPurposeIds.includes(p.id),
    })),
  };
}

export function declineConsent(record: ConsentRecord): ConsentRecord {
  return {
    ...record,
    status: 'declined',
    purposes: record.purposes.map(p => ({ ...p, accepted: false })),
  };
}

export function withdrawConsent(record: ConsentRecord): ConsentRecord {
  return {
    ...record,
    status: 'withdrawn',
    purposes: record.purposes.map(p => ({ ...p, accepted: false })),
  };
}

export function isConsentValid(record: ConsentRecord): boolean {
  if (record.status !== 'granted') {
    return false;
  }

  if (record.expiresAt) {
    const now = new Date();
    const expiry = new Date(record.expiresAt);
    if (now > expiry) {
      return false;
    }
  }

  // Check all required purposes are accepted
  const requiredPurposes = record.purposes.filter(p => p.required);
  return requiredPurposes.every(p => p.accepted);
}

export function checkConsentExpiry(record: ConsentRecord): ConsentRecord {
  if (record.status !== 'granted' || !record.expiresAt) {
    return record;
  }

  const now = new Date();
  const expiry = new Date(record.expiresAt);

  if (now > expiry) {
    return { ...record, status: 'expired' };
  }

  return record;
}

export function getConsentMessage(language: 'en' | 'th' = 'en'): string {
  if (language === 'th') {
    return 'กรุณาอ่านและยอมรับนโยบายความเป็นส่วนตัว (PDPA) ก่อนเริ่มใช้บริการ\n\n' +
      '1. การเก็บรวบรวมข้อมูลสุขภาพ (จำเป็น)\n' +
      '2. การประมวลผลด้วย AI (จำเป็น)\n' +
      '3. การแชร์ข้อมูลกับทีมแพทย์ (จำเป็น)\n' +
      '4. การแจ้งเตือนสุขภาพ (ไม่บังคับ)\n' +
      '5. การวิจัย (ไม่บังคับ)\n\n' +
      'ตอบ "ยอมรับ" เพื่อยินยอม หรือ "ปฏิเสธ" เพื่อปฏิเสธ';
  }

  return 'Please read and accept our Privacy Policy (PDPA) before using our services.\n\n' +
    '1. Medical Data Collection (Required)\n' +
    '2. AI-Assisted Processing (Required)\n' +
    '3. Healthcare Team Sharing (Required)\n' +
    '4. Health Notifications (Optional)\n' +
    '5. Research Use (Optional)\n\n' +
    'Reply "accept" to consent or "decline" to decline.';
}
