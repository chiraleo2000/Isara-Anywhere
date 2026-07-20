/**
 * Environment schema validation tests
 */
import { describe, it, expect } from 'vitest';
import {
  validateServerEnv,
  GEMINI_PLACEHOLDER,
} from '../../../scripts/env/schema.cjs';
import { resolveGeminiApiKey, isGeminiConfigured } from '../../../scripts/env/geminiKey.cjs';

describe('envSchema — boot validation', () => {
  const baseValid = {
    RECORDING_ENCRYPTION_KEY: 'x'.repeat(32),
    GEMINI_API_KEY: GEMINI_PLACEHOLDER,
  };

  it('ES01 — placeholder xxxxx passes schema', () => {
    const result = validateServerEnv(baseValid);
    expect(result.GEMINI_API_KEY).toBe('xxxxx');
  });

  it('ES02 — missing GEMINI_API_KEY throws clear error', () => {
    expect(() => validateServerEnv({ RECORDING_ENCRYPTION_KEY: 'x'.repeat(32) })).toThrow(/GEMINI_API_KEY/);
  });

  it('ES03 — empty GEMINI_API_KEY fails validation', () => {
    expect(() =>
      validateServerEnv({ RECORDING_ENCRYPTION_KEY: 'x'.repeat(32), GEMINI_API_KEY: '' }),
    ).toThrow(/GEMINI_API_KEY/);
  });

  it('ES04 — resolveGeminiApiKey returns placeholder when unset', () => {
    expect(resolveGeminiApiKey({})).toBe('xxxxx');
    expect(isGeminiConfigured({ GEMINI_API_KEY: 'xxxxx' })).toBe(false);
  });

  it('ES05 — any non-placeholder key passes isGeminiConfigured', () => {
    expect(isGeminiConfigured({ GEMINI_API_KEY: 'AIzaSyExampleKey123' })).toBe(true);
    expect(isGeminiConfigured({ GEMINI_API_KEY: 'AQ.Ab8ExampleAuthKey123' })).toBe(true);
    expect(isGeminiConfigured({ GEMINI_API_KEY: 'any-real-key-value' })).toBe(true);
  });
});
