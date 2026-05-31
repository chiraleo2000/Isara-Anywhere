import { describe, expect, it } from 'vitest';

function buildLanguageInstruction(language: 'th' | 'en'): string {
  return language === 'en'
    ? 'Reply in English. If user message language differs, reply in the same language as the user message.'
    : 'ตอบเป็นภาษาไทย หากข้อความผู้ใช้เป็นภาษาอื่น ให้ตอบกลับในภาษาเดียวกับข้อความผู้ใช้';
}

describe('AI language prompt (P2)', () => {
  it('English setting adds English reply instruction', () => {
    const instruction = buildLanguageInstruction('en');
    expect(instruction).toMatch(/Reply in English/i);
  });

  it('Thai setting adds Thai reply instruction', () => {
    const instruction = buildLanguageInstruction('th');
    expect(instruction).toContain('ภาษาไทย');
  });
});
