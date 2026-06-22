import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const aiPagePath = path.resolve(
  __dirname,
  '../../../Isara-patient-portal/frontend/pages/health/AIDoctorPage.tsx',
);

describe('AI new chat behavior (P1)', () => {
  it('startNewChat clears server history and reloads sessions', () => {
    const source = fs.readFileSync(aiPagePath, 'utf8');
    const block =
      /const startNewChat = (async )?\(\) => \{[\s\S]*?\n\s*\};/.exec(source)?.[0] ?? '';
    expect(block).toMatch(/clearChatHistory/);
    expect(block).toMatch(/loadSessions/);
    expect(block).toMatch(/setMessages\s*\(\s*\[\s*\]\s*\)/);
  });
});
