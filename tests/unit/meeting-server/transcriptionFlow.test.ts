/**
 * ═══════════════════════════════════════════════════════════════════════
 * Transcription Flow Logic Tests
 * Tests: Transcript segmentation, speaker labels, SOAP note generation
 * ═══════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from 'vitest';

// --- Types ---
interface TranscriptSegment {
  id: string;
  speaker: string;
  role: 'doctor' | 'patient' | 'system';
  text: string;
  timestamp: number; // ms offset from start
  confidence: number; // 0-1
  language: 'th' | 'en';
}

interface SOAPNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

// --- Functions ---

function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function filterByRole(segments: TranscriptSegment[], role: string): TranscriptSegment[] {
  return segments.filter(s => s.role === role);
}

function filterByConfidence(segments: TranscriptSegment[], minConfidence: number): TranscriptSegment[] {
  return segments.filter(s => s.confidence >= minConfidence);
}

function mergeConsecutiveSpeaker(segments: TranscriptSegment[]): TranscriptSegment[] {
  if (segments.length === 0) return [];
  const merged: TranscriptSegment[] = [{ ...segments[0] }];
  for (let i = 1; i < segments.length; i++) {
    const last = merged.at(-1)!;
    if (segments[i].speaker === last.speaker && segments[i].role === last.role) {
      last.text += ' ' + segments[i].text;
      last.confidence = Math.min(last.confidence, segments[i].confidence);
    } else {
      merged.push({ ...segments[i] });
    }
  }
  return merged;
}

function getTranscriptDuration(segments: TranscriptSegment[]): number {
  if (segments.length === 0) return 0;
  return Math.max(...segments.map(s => s.timestamp));
}

function countWords(segments: TranscriptSegment[]): number {
  return segments.reduce((sum, s) => sum + s.text.split(/\s+/).filter(Boolean).length, 0);
}

function getLanguageBreakdown(segments: TranscriptSegment[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const s of segments) {
    counts[s.language] = (counts[s.language] || 0) + 1;
  }
  return counts;
}

function validateSOAPNote(note: SOAPNote): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!note.subjective.trim()) missing.push('subjective');
  if (!note.objective.trim()) missing.push('objective');
  if (!note.assessment.trim()) missing.push('assessment');
  if (!note.plan.trim()) missing.push('plan');
  return { valid: missing.length === 0, missing };
}

// --- Test Data ---
const SAMPLE_TRANSCRIPT: TranscriptSegment[] = [
  { id: '1', speaker: 'Dr. Smith', role: 'doctor', text: 'สวัสดีครับ', timestamp: 0, confidence: 0.95, language: 'th' },
  { id: '2', speaker: 'Patient', role: 'patient', text: 'สวัสดีค่ะ คุณหมอ', timestamp: 2000, confidence: 0.9, language: 'th' },
  { id: '3', speaker: 'Dr. Smith', role: 'doctor', text: 'วันนี้มีอาการอะไรบ้างครับ', timestamp: 4000, confidence: 0.92, language: 'th' },
  { id: '4', speaker: 'Patient', role: 'patient', text: 'ปวดหัวมา 3 วันค่ะ', timestamp: 6000, confidence: 0.88, language: 'th' },
  { id: '5', speaker: 'Patient', role: 'patient', text: 'และมีไข้ด้วย', timestamp: 8000, confidence: 0.85, language: 'th' },
  { id: '6', speaker: 'Dr. Smith', role: 'doctor', text: 'I will check your temperature', timestamp: 10000, confidence: 0.97, language: 'en' },
  { id: '7', speaker: 'System', role: 'system', text: 'Recording started', timestamp: 0, confidence: 1, language: 'en' },
];

// --- Tests ---

describe('Transcription — Timestamp Formatting', () => {
  it('TX01 — 0ms → 00:00', () => {
    expect(formatTimestamp(0)).toBe('00:00');
  });

  it('TX02 — 65000ms → 01:05', () => {
    expect(formatTimestamp(65000)).toBe('01:05');
  });

  it('TX03 — 600000ms → 10:00', () => {
    expect(formatTimestamp(600000)).toBe('10:00');
  });
});

describe('Transcription — Filtering', () => {
  it('TX04 — filter doctor segments', () => {
    expect(filterByRole(SAMPLE_TRANSCRIPT, 'doctor')).toHaveLength(3);
  });

  it('TX05 — filter patient segments', () => {
    expect(filterByRole(SAMPLE_TRANSCRIPT, 'patient')).toHaveLength(3);
  });

  it('TX06 — filter system segments', () => {
    expect(filterByRole(SAMPLE_TRANSCRIPT, 'system')).toHaveLength(1);
  });

  it('TX07 — filter by confidence ≥ 0.9', () => {
    const result = filterByConfidence(SAMPLE_TRANSCRIPT, 0.9);
    expect(result.length).toBeGreaterThanOrEqual(4);
    expect(result.every(s => s.confidence >= 0.9)).toBe(true);
  });

  it('TX08 — filter by high confidence ≥ 0.95', () => {
    const result = filterByConfidence(SAMPLE_TRANSCRIPT, 0.95);
    expect(result.length).toBeGreaterThanOrEqual(2);
  });
});

describe('Transcription — Merging', () => {
  it('TX09 — merge consecutive same-speaker segments', () => {
    const merged = mergeConsecutiveSpeaker(SAMPLE_TRANSCRIPT);
    // Segments 4 and 5 (Patient) should merge
    expect(merged.length).toBeLessThan(SAMPLE_TRANSCRIPT.length);
  });

  it('TX10 — merged text contains both parts', () => {
    const merged = mergeConsecutiveSpeaker(SAMPLE_TRANSCRIPT);
    const patientMerged = merged.find(s => s.text.includes('ปวดหัว') && s.text.includes('ไข้'));
    expect(patientMerged).toBeDefined();
  });

  it('TX11 — empty transcript returns empty', () => {
    expect(mergeConsecutiveSpeaker([])).toHaveLength(0);
  });

  it('TX12 — single segment returns single', () => {
    expect(mergeConsecutiveSpeaker([SAMPLE_TRANSCRIPT[0]])).toHaveLength(1);
  });
});

describe('Transcription — Stats', () => {
  it('TX13 — duration is max timestamp', () => {
    expect(getTranscriptDuration(SAMPLE_TRANSCRIPT)).toBe(10000);
  });

  it('TX14 — empty transcript duration is 0', () => {
    expect(getTranscriptDuration([])).toBe(0);
  });

  it('TX15 — word count > 0', () => {
    expect(countWords(SAMPLE_TRANSCRIPT)).toBeGreaterThan(5);
  });

  it('TX16 — language breakdown', () => {
    const breakdown = getLanguageBreakdown(SAMPLE_TRANSCRIPT);
    expect(breakdown.th).toBe(5);
    expect(breakdown.en).toBe(2);
  });
});

describe('Transcription — SOAP Note Validation', () => {
  it('TX17 — complete SOAP note is valid', () => {
    const note: SOAPNote = { subjective: 'Headache 3 days', objective: 'Temp 38.5C', assessment: 'Viral infection', plan: 'Rest, monitor' };
    expect(validateSOAPNote(note).valid).toBe(true);
  });

  it('TX18 — missing subjective is invalid', () => {
    const note: SOAPNote = { subjective: '', objective: 'Temp 38.5C', assessment: 'Viral infection', plan: 'Rest' };
    const result = validateSOAPNote(note);
    expect(result.valid).toBe(false);
    expect(result.missing).toContain('subjective');
  });

  it('TX19 — all empty is invalid with 4 missing', () => {
    const note: SOAPNote = { subjective: '', objective: '', assessment: '', plan: '' };
    expect(validateSOAPNote(note).missing).toHaveLength(4);
  });
});
