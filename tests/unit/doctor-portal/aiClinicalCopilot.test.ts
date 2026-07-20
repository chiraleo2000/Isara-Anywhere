/**
 * Doctor frontend service: aiClinicalCopilot (Gemini mocked — no network).
 * Covers unconfigured fallbacks used in unit/CI without API keys.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn(),
  })),
}));

describe('aiClinicalCopilot', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('VITE_GEMINI_API_KEY', '');
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('reports AI unavailable without a valid key', async () => {
    const { aiCopilot } = await import('@doctor/services/aiClinicalCopilot.ts');
    expect(aiCopilot.isAIAvailable()).toBe(false);
  });

  it('chat returns fallback when model is unavailable', async () => {
    const { aiCopilot } = await import('@doctor/services/aiClinicalCopilot.ts');
    await aiCopilot.initialize({ currentSymptoms: ['fever'] });
    const msg = await aiCopilot.chat('Check drug interaction please');
    expect(msg.role).toBe('assistant');
    expect(msg.content).toMatch(/unavailable|not fully configured/i);
    expect(aiCopilot.getHistory().length).toBeGreaterThanOrEqual(2);
    aiCopilot.reset();
    expect(aiCopilot.getHistory()).toHaveLength(0);
  });

  it('getQuickSuggestions returns generic list without AI', async () => {
    const { aiCopilot } = await import('@doctor/services/aiClinicalCopilot.ts');
    const suggestions = await aiCopilot.getQuickSuggestions(['headache']);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(await aiCopilot.getQuickSuggestions([])).toEqual([]);
  });

  it('checkDrugInteractions returns manual-verify warning without AI', async () => {
    const { aiCopilot, aiClinicalService } = await import('@doctor/services/aiClinicalCopilot.ts');
    await expect(aiCopilot.checkDrugInteractions(['A'])).resolves.toEqual({
      interactions: [],
      warnings: [],
    });
    const multi = await aiClinicalService.checkDrugInteractions(['A', 'B']);
    expect(multi.warnings[0]).toMatch(/verify manually/i);
  });

  it('summarize / generateEMR use defaults without AI', async () => {
    const { aiClinicalService, meetingSummarizer, documentGenerator } = await import(
      '@doctor/services/aiClinicalCopilot.ts'
    );
    const summary = await aiClinicalService.summarize('Doctor: hello\nPatient: headache');
    expect(summary.chiefComplaint).toBeTruthy();
    expect(summary.followUpRecommended).toBe(true);
    expect(summary.confidence).toBe(0.5);

    const quick = await meetingSummarizer.quickSummary([]);
    expect(quick).toMatch(/Consultation completed/i);

    const emr = await documentGenerator.generateEMRContent(summary);
    expect(emr.chiefComplaint).toBe(summary.chiefComplaint);

    const rxs = await documentGenerator.generatePrescription({
      ...summary,
      prescriptions: [
        {
          medication: 'Paracetamol',
          dosage: '500mg',
          frequency: 'TID',
          duration: '3d',
          instructions: 'after meals',
        },
      ],
    } as never);
    expect(rxs).toHaveLength(1);
    expect(rxs[0].medication).toBe('Paracetamol');
  });
});
