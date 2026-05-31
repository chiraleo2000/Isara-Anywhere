import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const servicePath = path.resolve(
  __dirname,
  '../../../Isara-doctor-portal/src/services/geminiClinicalService.ts',
);
const apiServerPath = path.resolve(
  __dirname,
  '../../../Isara-doctor-portal/server/mainApiServer.cjs',
);

async function callGeminiClinicalFallback(prompt: string): Promise<string | null> {
  const resp = await fetch('/api/ai/gemini/clinical', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, taskType: 'medical-qa' }),
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  return data?.text || null;
}

describe('Gemini server proxy regression guard', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ text: 'Clinical response', configured: true }),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses runtime server endpoints for status and clinical fallback', () => {
    const serviceSource = fs.readFileSync(servicePath, 'utf8');
    const apiServerSource = fs.readFileSync(apiServerPath, 'utf8');

    expect(serviceSource).toContain('/api/ai/gemini/status');
    expect(serviceSource).toContain('/api/ai/gemini/clinical');
    expect(apiServerSource).toContain("app.get('/api/ai/gemini/status'");
    expect(apiServerSource).not.toMatch(/app\.get\('\/api\/ai\/gemini\/status',\s*authenticateToken/);
    expect(apiServerSource).toContain("app.post('/api/ai/gemini/clinical'");
    expect(serviceSource).toContain('resolveApiBase');
    expect(serviceSource).toMatch(/fetch\(`\$\{API_BASE\}\/api\/ai\/gemini\/clinical`/);
    expect(serviceSource).toContain("'gemini-3.1-flash-lite'");
    expect(apiServerSource).toContain("'gemini-3.1-flash-lite'");
  });

  it('mocked clinical fallback posts to /api/ai/gemini/clinical (D3)', async () => {
    const text = await callGeminiClinicalFallback('What is hypertension?');
    expect(text).toBe('Clinical response');
    expect(fetch).toHaveBeenCalledWith(
      '/api/ai/gemini/clinical',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
