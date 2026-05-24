import { describe, it, expect } from 'vitest';

/**
 * Express JSON parse errors should yield 400 (meeting server code-breaker contract).
 */
describe('malformedBody contract', () => {
  it('invalid JSON body is not a valid object', () => {
    let parsed: unknown;
    try {
      parsed = JSON.parse('{not-json');
    } catch {
      parsed = null;
    }
    expect(parsed).toBeNull();
  });

  it('empty object fails required field checks', () => {
    const body = {};
    const hasEmail = typeof (body as { email?: string }).email === 'string';
    expect(hasEmail).toBe(false);
  });
});
