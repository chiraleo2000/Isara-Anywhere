/**
 * AI Doctor triage — Processes/Pages/Patient-Portal/07_AI_Doctor_Page.md
 */
import { describe, it, expect } from 'vitest';

type TriageLevel = 'emergency' | 'urgent' | 'routine';

interface TriageResult {
  level: TriageLevel;
  redFlags: string[];
  suggestBook: boolean;
  message: string;
}

function triageSymptoms(text: string): TriageResult {
  const t = text.toLowerCase();
  const redFlags: string[] = [];
  if (/เจ็บหน้าอก|หายใจลำบาก|หมดสติ|ชัก/.test(t)) redFlags.push('cardiac_or_respiratory');
  if (/เลือดออกมาก|ฆ่าตัวตาย/.test(t)) redFlags.push('severe_bleeding_or_self_harm');
  let level: TriageLevel = 'routine';
  if (redFlags.length > 0) level = 'emergency';
  else if (/ไข้สูง|ปวดรุนแรง|อาเจียนซ้ำ/.test(t)) level = 'urgent';
  return {
    level,
    redFlags,
    suggestBook: level !== 'emergency',
    message: level === 'emergency' ? 'โปรดติดต่อฉุกเฉินทันที' : 'พบแพทย์ออนไลน์ได้',
  };
}

describe('AI triage schema', () => {
  it('flags emergency chest pain', () => {
    const r = triageSymptoms('เจ็บหน้าอกมาก หายใจลำบาก');
    expect(r.level).toBe('emergency');
    expect(r.redFlags.length).toBeGreaterThan(0);
    expect(r.suggestBook).toBe(false);
  });

  it('routine headache suggests book', () => {
    const r = triageSymptoms('ปวดหัวเล็กน้อย');
    expect(r.level).toBe('routine');
    expect(r.suggestBook).toBe(true);
  });
});
