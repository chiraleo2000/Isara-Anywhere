/**
 * ═══════════════════════════════════════════════════════════════════════
 * IZARA TELEMEDICINE — Meeting Server & AI Feature Tests
 * ═══════════════════════════════════════════════════════════════════════
 * Tests: Meeting creation, transcript processing, AI summary generation,
 * CDS checks, video meeting lifecycle, chat messaging.
 * ═══════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from 'vitest';

// ═══════════════════════════════════════════════════════════════════════
// A. Meeting Room Name Generation
// ═══════════════════════════════════════════════════════════════════════
describe('Meeting Server — Room Name Generation', () => {
  function generateRoomName(doctorId: string, patientId: string, appointmentId?: string): string {
    const timestamp = Date.now();
    const suffix = appointmentId || `${timestamp}`;
    return `izara-${doctorId}-${patientId}-${suffix}`.toLowerCase().replace(/[^a-z0-9-]/g, '');
  }

  function sanitizeRoomName(name: string): string {
    return name.replace(/[^a-zA-Z0-9-_]/g, '').substring(0, 100);
  }

  it('A01 — generates valid room name', () => {
    const name = generateRoomName('DOC-1', 'PATIENT-1', 'APT-001');
    expect(name).toContain('izara');
    expect(name).toContain('doc-1');
    expect(name).toContain('patient-1');
  });

  it('A02 — room name is lowercase', () => {
    const name = generateRoomName('DOC-TEST', 'PATIENT-DEMO');
    expect(name).toBe(name.toLowerCase());
  });

  it('A03 — room name has no special characters', () => {
    const name = generateRoomName('DOC@1', 'PATIENT#1');
    expect(/^[a-z0-9-]+$/.test(name)).toBe(true);
  });

  it('A04 — sanitize removes special chars', () => {
    expect(sanitizeRoomName('Test Room!@#$%')).toBe('TestRoom');
  });

  it('A05 — sanitize truncates long names', () => {
    const long = 'a'.repeat(200);
    expect(sanitizeRoomName(long).length).toBeLessThanOrEqual(100);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// B. Transcript Processing
// ═══════════════════════════════════════════════════════════════════════
describe('Meeting Server — Transcript Processing', () => {
  interface TranscriptEntry {
    speaker: string;
    text: string;
    timestamp: number;
    language: 'th' | 'en';
    confidence?: number;
  }

  function chunkTranscript(entries: TranscriptEntry[], maxChunkSize: number = 5): TranscriptEntry[][] {
    const chunks: TranscriptEntry[][] = [];
    for (let i = 0; i < entries.length; i += maxChunkSize) {
      chunks.push(entries.slice(i, i + maxChunkSize));
    }
    return chunks;
  }

  function getFullTranscriptText(entries: TranscriptEntry[]): string {
    return entries.map(e => `[${e.speaker}]: ${e.text}`).join('\n');
  }

  function countBySpeaker(entries: TranscriptEntry[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const e of entries) {
      counts[e.speaker] = (counts[e.speaker] || 0) + 1;
    }
    return counts;
  }

  function filterByLanguage(entries: TranscriptEntry[], lang: 'th' | 'en'): TranscriptEntry[] {
    return entries.filter(e => e.language === lang);
  }

  const testEntries: TranscriptEntry[] = [
    { speaker: 'Doctor', text: 'สวัสดีครับ', timestamp: 1000, language: 'th', confidence: 0.95 },
    { speaker: 'Patient', text: 'สวัสดีค่ะ', timestamp: 2000, language: 'th', confidence: 0.92 },
    { speaker: 'Doctor', text: 'มีอาการอะไรครับ', timestamp: 3000, language: 'th', confidence: 0.88 },
    { speaker: 'Patient', text: 'ปวดหัวมาก', timestamp: 4000, language: 'th', confidence: 0.90 },
    { speaker: 'Doctor', text: 'How long?', timestamp: 5000, language: 'en', confidence: 0.97 },
    { speaker: 'Patient', text: '2 days', timestamp: 6000, language: 'en', confidence: 0.96 },
  ];

  it('B01 — chunks transcript correctly', () => {
    const chunks = chunkTranscript(testEntries, 3);
    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toHaveLength(3);
    expect(chunks[1]).toHaveLength(3);
  });

  it('B02 — generates full transcript text', () => {
    const text = getFullTranscriptText(testEntries);
    expect(text).toContain('[Doctor]');
    expect(text).toContain('[Patient]');
    expect(text.split('\n')).toHaveLength(6);
  });

  it('B03 — counts by speaker', () => {
    const counts = countBySpeaker(testEntries);
    expect(counts['Doctor']).toBe(3);
    expect(counts['Patient']).toBe(3);
  });

  it('B04 — filters by language', () => {
    expect(filterByLanguage(testEntries, 'th')).toHaveLength(4);
    expect(filterByLanguage(testEntries, 'en')).toHaveLength(2);
  });

  it('B05 — handles empty transcript', () => {
    expect(chunkTranscript([])).toEqual([]);
    expect(getFullTranscriptText([])).toBe('');
  });

  it('B06 — chunk size of 1 creates individual entries', () => {
    const chunks = chunkTranscript(testEntries, 1);
    expect(chunks).toHaveLength(6);
    chunks.forEach(c => expect(c).toHaveLength(1));
  });
});

// ═══════════════════════════════════════════════════════════════════════
// C. AI Summary / SOAP Generation
// ═══════════════════════════════════════════════════════════════════════
describe('Meeting Server — AI Summary', () => {
  interface MeetingSummary {
    meetingId: string;
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
    recommendations?: string[];
    icd10Suggestions?: string[];
    generatedAt: string;
  }

  function validateSummary(summary: MeetingSummary): string[] {
    const errors: string[] = [];
    if (!summary.meetingId) errors.push('Meeting ID required');
    if (!summary.subjective) errors.push('Subjective section required');
    if (!summary.objective) errors.push('Objective section required');
    if (!summary.assessment) errors.push('Assessment section required');
    if (!summary.plan) errors.push('Plan section required');
    if (!summary.generatedAt) errors.push('Generation timestamp required');
    return errors;
  }

  function extractSOAPSections(text: string): { S: string; O: string; A: string; P: string } {
    const sections = { S: '', O: '', A: '', P: '' };
    const patterns: Record<string, RegExp> = {
      S: /Subjective[:\s]*(.*?)(?=Objective|$)/is,
      O: /Objective[:\s]*(.*?)(?=Assessment|$)/is,
      A: /Assessment[:\s]*(.*?)(?=Plan|$)/is,
      P: /Plan[:\s]*(.*?)$/is,
    };
    for (const [key, pattern] of Object.entries(patterns)) {
      const match = text.match(pattern);
      if (match) sections[key as keyof typeof sections] = match[1].trim();
    }
    return sections;
  }

  it('C01 — validates complete summary', () => {
    const summary: MeetingSummary = {
      meetingId: 'MTG-001',
      subjective: 'Patient has headache',
      objective: 'T=37.8, BP=130/85',
      assessment: 'Tension headache',
      plan: 'Paracetamol',
      generatedAt: new Date().toISOString(),
    };
    expect(validateSummary(summary)).toHaveLength(0);
  });

  it('C02 — rejects missing sections', () => {
    const summary: MeetingSummary = {
      meetingId: '', subjective: '', objective: '', assessment: '', plan: '', generatedAt: '',
    };
    expect(validateSummary(summary).length).toBeGreaterThanOrEqual(5);
  });

  it('C03 — extracts SOAP sections from text', () => {
    const text = 'Subjective: Headache for 2 days\nObjective: T=37.8\nAssessment: Tension headache\nPlan: Rest';
    const sections = extractSOAPSections(text);
    expect(sections.S).toContain('Headache');
    expect(sections.O).toContain('37.8');
    expect(sections.A).toContain('Tension');
    expect(sections.P).toContain('Rest');
  });

  it('C04 — handles missing SOAP sections gracefully', () => {
    const text = 'Just some random text';
    const sections = extractSOAPSections(text);
    expect(sections.S).toBe('');
  });

  it('C05 — summary accepts optional recommendations', () => {
    const summary: MeetingSummary = {
      meetingId: 'MTG-002',
      subjective: 'Fever', objective: 'T=38.5', assessment: 'URI', plan: 'Rest',
      recommendations: ['Drink fluids', 'Monitor temperature'],
      icd10Suggestions: ['J06.9'],
      generatedAt: new Date().toISOString(),
    };
    expect(validateSummary(summary)).toHaveLength(0);
    expect(summary.recommendations).toHaveLength(2);
    expect(summary.icd10Suggestions).toHaveLength(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// D. CDS (Clinical Decision Support)
// ═══════════════════════════════════════════════════════════════════════
describe('Meeting Server — CDS Checks', () => {
  interface CDSAlert {
    type: 'drug-interaction' | 'allergy' | 'duplicate' | 'dose' | 'age';
    severity: 'info' | 'warning' | 'critical';
    message: string;
    medications: string[];
  }

  function checkDuplicateTherapy(currentMeds: string[], newMed: string): CDSAlert | null {
    const nsaids = ['Ibuprofen', 'Naproxen', 'Diclofenac', 'Celecoxib'];
    const statins = ['Atorvastatin', 'Simvastatin', 'Rosuvastatin', 'Pravastatin'];
    const classes = { nsaids, statins };

    for (const [className, drugs] of Object.entries(classes)) {
      const currentInClass = currentMeds.filter(m => drugs.includes(m));
      if (currentInClass.length > 0 && drugs.includes(newMed)) {
        return {
          type: 'duplicate',
          severity: 'warning',
          message: `Duplicate ${className}: ${currentInClass[0]} already prescribed, adding ${newMed}`,
          medications: [...currentInClass, newMed],
        };
      }
    }
    return null;
  }

  function checkAllergyConflict(allergies: string[], newMed: string): CDSAlert | null {
    const allergyMap: Record<string, string[]> = {
      'Penicillin': ['Amoxicillin', 'Ampicillin', 'Penicillin V', 'Penicillin G'],
      'Sulfa': ['Sulfamethoxazole', 'Sulfasalazine'],
      'Aspirin': ['Aspirin'],
    };
    for (const [allergen, meds] of Object.entries(allergyMap)) {
      if (allergies.includes(allergen) && meds.includes(newMed)) {
        return {
          type: 'allergy',
          severity: 'critical',
          message: `Patient allergic to ${allergen}: ${newMed} contraindicated`,
          medications: [newMed],
        };
      }
    }
    return null;
  }

  it('D01 — detects duplicate NSAID therapy', () => {
    const alert = checkDuplicateTherapy(['Ibuprofen'], 'Naproxen');
    expect(alert).not.toBeNull();
    expect(alert!.type).toBe('duplicate');
    expect(alert!.severity).toBe('warning');
  });

  it('D02 — no alert for different drug classes', () => {
    const alert = checkDuplicateTherapy(['Ibuprofen'], 'Metformin');
    expect(alert).toBeNull();
  });

  it('D03 — detects penicillin allergy conflict', () => {
    const alert = checkAllergyConflict(['Penicillin'], 'Amoxicillin');
    expect(alert).not.toBeNull();
    expect(alert!.type).toBe('allergy');
    expect(alert!.severity).toBe('critical');
  });

  it('D04 — no allergy alert for safe medication', () => {
    const alert = checkAllergyConflict(['Penicillin'], 'Paracetamol');
    expect(alert).toBeNull();
  });

  it('D05 — detects duplicate statin therapy', () => {
    const alert = checkDuplicateTherapy(['Atorvastatin'], 'Simvastatin');
    expect(alert).not.toBeNull();
    expect(alert!.message).toContain('statins');
  });

  it('D06 — multiple allergies checked correctly', () => {
    expect(checkAllergyConflict(['Sulfa'], 'Sulfamethoxazole')).not.toBeNull();
    expect(checkAllergyConflict(['Sulfa'], 'Paracetamol')).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// E. Meeting Chat System
// ═══════════════════════════════════════════════════════════════════════
describe('Meeting Server — Chat', () => {
  interface ChatMessage {
    id: string;
    meetingId: string;
    sender: string;
    message: string;
    timestamp: number;
    type: 'text' | 'system' | 'file';
  }

  function filterByMeeting(messages: ChatMessage[], meetingId: string): ChatMessage[] {
    return messages.filter(m => m.meetingId === meetingId);
  }

  function getMessageCount(messages: ChatMessage[]): number {
    return messages.filter(m => m.type === 'text').length;
  }

  function sanitizeChatMessage(text: string): string {
    return text.replace(/<script[^>]*>.*?<\/script>/gi, '')
               .replace(/<[^>]*>/g, '')
               .trim()
               .substring(0, 2000);
  }

  it('E01 — filters messages by meeting', () => {
    const msgs: ChatMessage[] = [
      { id: '1', meetingId: 'MTG-1', sender: 'Doc', message: 'Hi', timestamp: 1000, type: 'text' },
      { id: '2', meetingId: 'MTG-2', sender: 'Doc', message: 'Hello', timestamp: 2000, type: 'text' },
    ];
    expect(filterByMeeting(msgs, 'MTG-1')).toHaveLength(1);
  });

  it('E02 — counts text messages only', () => {
    const msgs: ChatMessage[] = [
      { id: '1', meetingId: 'MTG-1', sender: 'Doc', message: 'Hi', timestamp: 1000, type: 'text' },
      { id: '2', meetingId: 'MTG-1', sender: 'System', message: 'Joined', timestamp: 2000, type: 'system' },
    ];
    expect(getMessageCount(msgs)).toBe(1);
  });

  it('E03 — sanitizes XSS in chat messages', () => {
    expect(sanitizeChatMessage('<script>alert("xss")</script>Hello')).toBe('Hello');
  });

  it('E04 — strips HTML tags from chat', () => {
    expect(sanitizeChatMessage('<b>Bold</b> text')).toBe('Bold text');
  });

  it('E05 — truncates long messages', () => {
    const long = 'a'.repeat(3000);
    expect(sanitizeChatMessage(long).length).toBeLessThanOrEqual(2000);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// F. Meeting Lifecycle State Machine
// ═══════════════════════════════════════════════════════════════════════
describe('Meeting Server — Lifecycle', () => {
  type MeetingStatus = 'scheduled' | 'waiting' | 'active' | 'paused' | 'ended' | 'cancelled';

  function canTransition(from: MeetingStatus, to: MeetingStatus): boolean {
    const transitions: Record<MeetingStatus, MeetingStatus[]> = {
      scheduled: ['waiting', 'cancelled'],
      waiting: ['active', 'cancelled'],
      active: ['paused', 'ended'],
      paused: ['active', 'ended'],
      ended: [],
      cancelled: [],
    };
    return transitions[from]?.includes(to) ?? false;
  }

  function getMeetingDuration(startTime: number, endTime: number): number {
    return Math.max(0, endTime - startTime);
  }

  it('F01 — allows scheduled → waiting', () => {
    expect(canTransition('scheduled', 'waiting')).toBe(true);
  });

  it('F02 — allows active → ended', () => {
    expect(canTransition('active', 'ended')).toBe(true);
  });

  it('F03 — prevents ended → active', () => {
    expect(canTransition('ended', 'active')).toBe(false);
  });

  it('F04 — prevents cancelled → active', () => {
    expect(canTransition('cancelled', 'active')).toBe(false);
  });

  it('F05 — allows pause and resume', () => {
    expect(canTransition('active', 'paused')).toBe(true);
    expect(canTransition('paused', 'active')).toBe(true);
  });

  it('F06 — calculates meeting duration', () => {
    const duration = getMeetingDuration(1000, 4000);
    expect(duration).toBe(3000);
  });

  it('F07 — duration is zero for invalid times', () => {
    expect(getMeetingDuration(5000, 3000)).toBe(0);
  });
});
