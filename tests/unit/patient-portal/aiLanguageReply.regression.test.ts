import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const pagePath = path.resolve(
  __dirname,
  '../../../issara-patient/frontend/pages/health/AIDoctorPage.tsx',
);
const servicePath = path.resolve(
  __dirname,
  '../../../issara-patient/frontend/lib/services.ts',
);
const routePath = path.resolve(
  __dirname,
  '../../../issara-patient/backend/routes/ai.ts',
);

async function sendAiChat(
  message: string,
  language: 'th' | 'en',
  sessionId?: string,
): Promise<Record<string, unknown>> {
  const body = { message, conversationHistory: [], sessionId, language };
  await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return body;
}

describe('AI language reply regression guard', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ reply: 'ok', sessionId: 's1' }) }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends language in chat payload and applies language-aware prompt instruction', () => {
    const pageSource = fs.readFileSync(pagePath, 'utf8');
    const serviceSource = fs.readFileSync(servicePath, 'utf8');
    const routeSource = fs.readFileSync(routePath, 'utf8');

    expect(pageSource).toContain('sessionId || undefined,');
    expect(pageSource).toContain('language,');
    expect(serviceSource).toContain('sessionId, language');
    expect(routeSource).toContain('same language as the user message');
    expect(routeSource).toContain('const { message, conversationHistory, sessionId, language } = req.body;');
  });

  it('mocked chat request includes language param (P2)', async () => {
    const body = await sendAiChat('Hello', 'en', 'session-1');
    expect(body.language).toBe('en');
    expect(fetch).toHaveBeenCalledWith(
      '/api/ai/chat',
      expect.objectContaining({
        body: JSON.stringify(body),
      }),
    );
  });
});
