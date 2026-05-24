/**
 * Doctor auth rate limiting — Processes/Pages/Doctor-Portal/01_Login_Page.md
 */
import { describe, it, expect } from 'vitest';

class LoginRateLimiter {
  private attempts = new Map<string, { count: number; resetAt: number }>();
  constructor(
    private maxAttempts: number,
    private windowMs: number,
  ) {}

  check(key: string): { allowed: boolean; retryAfterMs?: number } {
    const now = Date.now();
    const entry = this.attempts.get(key);
    if (!entry || now > entry.resetAt) {
      this.attempts.set(key, { count: 1, resetAt: now + this.windowMs });
      return { allowed: true };
    }
    if (entry.count >= this.maxAttempts) {
      return { allowed: false, retryAfterMs: entry.resetAt - now };
    }
    entry.count += 1;
    return { allowed: true };
  }
}

describe('Doctor login rate limiter (HTTP policy)', () => {
  it('blocks after 5 failures in window', () => {
    const limiter = new LoginRateLimiter(5, 60_000);
    const email = 'doctor@test.local';
    for (let i = 0; i < 5; i++) {
      expect(limiter.check(email).allowed).toBe(true);
    }
    const blocked = limiter.check(email);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });
});
