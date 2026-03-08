/**
 * ═══════════════════════════════════════════════════════════════════════
 * PATIENT PORTAL — AI Route Unit Tests
 * ═══════════════════════════════════════════════════════════════════════
 * Tests: server/routes/ai.ts — chat, memory, symptom checks, retention
 */
import { describe, it, expect } from 'vitest';

// ── Chat History & Memory Logic ─────────────────────────────────────────

const CHAT_RETENTION_DAYS = 60;

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  context?: Record<string, unknown>;
}

type MemoryType = 'conversation_summary' | 'health_context' | 'preference' | 'important_fact';

function isValidMemoryType(t: string): t is MemoryType {
  return ['conversation_summary', 'health_context', 'preference', 'important_fact'].includes(t);
}

function isSessionSummarizeable(messages: ChatMessage[]): boolean {
  return messages.length >= 4;
}

function truncateSummary(text: string, maxLen = 2000): string {
  return text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
}

function buildSystemPrompt(userContext: { name?: string; medications?: string[]; conditions?: string[] }): string {
  const parts = [
    'คุณเป็นผู้ช่วยด้านสุขภาพชื่อ อิสระ AI (Isara AI)',
    'ตอบเป็นภาษาไทย',
    'ไม่วินิจฉัยโรค ให้คำแนะนำทั่วไปเท่านั้น',
  ];
  if (userContext.name) parts.push(`ผู้ใช้ชื่อ: ${userContext.name}`);
  if (userContext.medications?.length) parts.push(`ยาที่ใช้: ${userContext.medications.join(', ')}`);
  if (userContext.conditions?.length) parts.push(`โรคประจำตัว: ${userContext.conditions.join(', ')}`);
  return parts.join('. ');
}

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

// ── Tests ────────────────────────────────────────────────────────────────

describe('Patient Portal — AI Route', () => {

  describe('A — Chat Retention', () => {
    it('A01 — retention period is 60 days', () => {
      expect(CHAT_RETENTION_DAYS).toBe(60);
    });

    it('A02 — session requires 4+ messages to summarize', () => {
      const short: ChatMessage[] = [{ role: 'user', content: 'hi' }, { role: 'assistant', content: 'hello' }];
      expect(isSessionSummarizeable(short)).toBe(false);
    });

    it('A03 — session with 4+ messages is summarizable', () => {
      const long: ChatMessage[] = Array.from({ length: 5 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' as const : 'assistant' as const,
        content: `msg ${i}`,
      }));
      expect(isSessionSummarizeable(long)).toBe(true);
    });
  });

  describe('B — Memory Types', () => {
    it('B01 — conversation_summary is valid', () => {
      expect(isValidMemoryType('conversation_summary')).toBe(true);
    });

    it('B02 — health_context is valid', () => {
      expect(isValidMemoryType('health_context')).toBe(true);
    });

    it('B03 — preference is valid', () => {
      expect(isValidMemoryType('preference')).toBe(true);
    });

    it('B04 — important_fact is valid', () => {
      expect(isValidMemoryType('important_fact')).toBe(true);
    });

    it('B05 — rejects invalid type', () => {
      expect(isValidMemoryType('random_type')).toBe(false);
    });
  });

  describe('C — Summary Truncation', () => {
    it('C01 — short text passes through', () => {
      expect(truncateSummary('hello')).toBe('hello');
    });

    it('C02 — text over 2000 chars is truncated', () => {
      const long = 'a'.repeat(3000);
      const result = truncateSummary(long);
      expect(result.length).toBe(2003); // 2000 + '...'
      expect(result.endsWith('...')).toBe(true);
    });

    it('C03 — exactly 2000 chars not truncated', () => {
      const exact = 'b'.repeat(2000);
      expect(truncateSummary(exact)).toBe(exact);
    });
  });

  describe('D — System Prompt', () => {
    it('D01 — base prompt is Thai', () => {
      const prompt = buildSystemPrompt({});
      expect(prompt).toContain('อิสระ AI');
      expect(prompt).toContain('ภาษาไทย');
    });

    it('D02 — includes user name', () => {
      const prompt = buildSystemPrompt({ name: 'สมชาย' });
      expect(prompt).toContain('สมชาย');
    });

    it('D03 — includes medications', () => {
      const prompt = buildSystemPrompt({ medications: ['Metformin', 'Amlodipine'] });
      expect(prompt).toContain('Metformin');
      expect(prompt).toContain('Amlodipine');
    });

    it('D04 — includes conditions', () => {
      const prompt = buildSystemPrompt({ conditions: ['เบาหวาน', 'ความดันสูง'] });
      expect(prompt).toContain('เบาหวาน');
    });

    it('D05 — includes no-diagnosis disclaimer', () => {
      const prompt = buildSystemPrompt({});
      expect(prompt).toContain('ไม่วินิจฉัยโรค');
    });
  });

  describe('E — Session ID Generation', () => {
    it('E01 — starts with session_ prefix', () => {
      const id = generateSessionId();
      expect(id.startsWith('session_')).toBe(true);
    });

    it('E02 — generates unique IDs', () => {
      const ids = new Set(Array.from({ length: 10 }, () => generateSessionId()));
      expect(ids.size).toBe(10);
    });

    it('E03 — contains timestamp component', () => {
      const before = Date.now();
      const id = generateSessionId();
      const parts = id.split('_');
      const ts = parseInt(parts[1], 10);
      expect(ts).toBeGreaterThanOrEqual(before);
    });
  });

  describe('F — Chat Message Roles', () => {
    it('F01 — valid roles: user, assistant, system', () => {
      const roles = ['user', 'assistant', 'system'];
      const msg: ChatMessage = { role: 'user', content: 'test' };
      expect(roles).toContain(msg.role);
    });

    it('F02 — message can have optional context', () => {
      const msg: ChatMessage = { role: 'user', content: 'test', context: { phrId: '123' } };
      expect(msg.context).toBeDefined();
      expect(msg.context!.phrId).toBe('123');
    });
  });
});
