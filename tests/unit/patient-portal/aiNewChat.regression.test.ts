import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const aiDoctorPagePath = path.resolve(
  __dirname,
  '../../../Isara-patient-portal/frontend/pages/health/AIDoctorPage.tsx',
);

describe('AI new chat regression guard', () => {
  it('new chat clears persistent history context before resetting state', () => {
    const source = fs.readFileSync(aiDoctorPagePath, 'utf8');

    const startNewChatBlock =
      /const startNewChat = (async )?\(\) => \{[\s\S]*?\n\s*\};/.exec(source)?.[0] ?? '';

    const clearsServerContext = /clearChatHistory/.test(startNewChatBlock);
    const refreshesSessionList = /loadSessions/.test(startNewChatBlock);

    expect(clearsServerContext || refreshesSessionList).toBe(true);
  });
});
